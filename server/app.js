import { createHash, randomUUID } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import express from 'express';
import { tubePattern, withQueue } from './beanstalk.js';
import { sampleStore } from './samples.js';
import { sharedServerStore } from './shared-servers.js';
import { browserServerStore } from './browser-servers.js';
import { legacyActions } from './legacy.js';
import { consoleAuth } from './auth.js';
import { applyTubeAction, jobView, searchJobs, states } from './operations.js';
import { clearJobsInBatches, createDeletionQueue } from './clear-jobs.js';

const idPattern = /^[1-9][0-9]{0,19}(?![\s\S])/;
const directEndpointPattern = /^(?:beanstalk:\/\/)?(?:\[[a-f0-9:.]+\]|[a-z0-9._-]+):[0-9]{1,5}$/i;
const maximumId = 18446744073709551615n;
const maxUint = 4294967295;
const loopbackHosts = new Set(['localhost', '127.0.0.1', '::1']);
const loopbackPeers = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const browserServerCookie = 'console_server_list';
const digest = value => createHash('sha256').update(value).digest();

function fail(status, message) {
  throw Object.assign(new Error(message), { status });
}

function tubeName(value) {
  if (typeof value !== 'string' || !tubePattern.test(value)) fail(400, 'Invalid tube name');
  return value;
}

function selectedTubes(tubes) {
  if (!Array.isArray(tubes) || tubes.length === 0 || tubes.length > 50) fail(400, 'Select 1–50 tubes');
  return [...new Set(tubes.map(tubeName))];
}

function jobId(value) {
  if (typeof value !== 'string' || !idPattern.test(value) || BigInt(value) > maximumId) fail(400, 'Invalid job ID');
  return value;
}

function integer(value, fallback, min, max) {
  const result = value ?? fallback;
  if (!Number.isSafeInteger(result) || result < min || result > max) fail(400, `Expected a number from ${min} to ${max}`);
  return result;
}

function serverEntry(address, label) {
  const url = new URL(address.includes('://') ? address : 'beanstalk://' + address);
  if (url.protocol !== 'beanstalk:' || !url.hostname || !/^(\[[a-f0-9:.]+\]|[a-z0-9._-]+)$/i.test(url.hostname)
      || url.username || url.password || (url.pathname && url.pathname !== '/') || url.search || url.hash) {
    throw new Error('Expected a beanstalkd hostname and optional port');
  }
  const port = Number(url.port || 11300);
  if (port < 1 || port > 65535) throw new Error('Invalid beanstalkd port');
  const endpoint = url.hostname.toLowerCase() + ':' + port;
  return {
    id: digest(endpoint).toString('hex').slice(0, 24),
    label: label || endpoint, endpoint, host: url.hostname.replace(/^\[|\]$/g, ''), port,
  };
}

function runTubeAction(server, tube, action, options, deadline = Date.now() + 10000) {
  if (Date.now() >= deadline) return { affected: 0, stopped: 'timeout' };
  return withQueue(server, async queue => {
    if (options.state !== 'all') return applyTubeAction(queue, tube, action, options, deadline);
    let affected = 0;
    for (const state of states) {
      if (Date.now() >= deadline) return { affected, stopped: 'timeout' };
      const result = await applyTubeAction(queue, tube, action, {
        ...options, state, limit: options.limit - affected,
        onProgress: options.onProgress && (count => options.onProgress(affected + count)),
      }, deadline);
      affected += result.affected;
      if (result.error || result.stopped) return { ...result, affected };
    }
    return { affected };
  });
}

function decodeCookies(request) {
  return new Map((request.get('cookie') || '').split(';').map(part => {
    const entry = part.trim();
    const equals = entry.indexOf('=');
    return equals < 0 ? [entry, ''] : [entry.slice(0, equals), entry.slice(equals + 1)];
  }));
}

export function createApp(env = process.env) {
  const app = express();
  const api = express.Router();
  const enqueueJobBatch = createDeletionQueue();
  const jobBatches = new Map();
  const configured = new Map();
  const config = env.BEANSTALK_SERVERS ? env.BEANSTALK_SERVERS.split(',').map(value => value.trim()).filter(Boolean) : [];
  if (env.BEANSTALKD_HOST) config.unshift(`Default server=${env.BEANSTALKD_HOST}:${env.BEANSTALKD_PORT || 11300}`);
  if (config.length === 0) config.push('Local beanstalkd=127.0.0.1:11300');
  for (const entry of config) {
    const separator = entry.indexOf('=');
    const server = separator < 0 ? serverEntry(entry) : serverEntry(entry.slice(separator + 1), entry.slice(0, separator));
    configured.set(server.id, server);
  }

  const auth = consoleAuth(env, decodeCookies);
  const personalMode = env.ALLOW_PERSONAL_SERVERS || 'true';
  const personalEnabled = personalMode === 'true';
  const loopbackBind = loopbackHosts.has(env.HOST || '127.0.0.1');
  const localManagement = personalMode === 'local';
  if (localManagement && !loopbackBind) {
    throw new Error('Local server management requires a loopback bind address');
  }
  const samplePath = resolve(env.SAMPLE_STORAGE || 'storage.json');
  const samples = sampleStore(samplePath);
  const sharedServers = sharedServerStore(resolve(env.SHARED_SERVERS_STORAGE || join(dirname(samplePath), 'shared-servers.json')));

  const browserServers = browserServerStore(join(dirname(samplePath), 'browser-servers'));

  function canManage(request) {
    if (personalEnabled) return true;
    if (!localManagement || !loopbackPeers.has(request.socket.remoteAddress) ||
      request.get('Forwarded') || request.get('X-Forwarded-For') || request.get('X-Forwarded-Host')) return false;
    const host = request.get('Host') || '';
    return /^((localhost|127\.0\.0\.1)|\[::1\])(:[0-9]+)?$/i.test(host);
  }

  function legacyPreferences(cookies) {
    try {
      const current = cookies.get('console_servers');
      return current !== undefined ? JSON.parse(decodeURIComponent(current))
        : decodeURIComponent(cookies.get('beansServers') || '').split(';').filter(Boolean);
    } catch {
      return null;
    }
  }

  function parsePreferences(document) {
    const entries = new Map();
    const hidden = new Set();
    const values = Array.isArray(document) ? document : document?.entries;
    if (Array.isArray(document?.hidden)) {
      for (const id of document.hidden) if (configured.has(id)) hidden.add(id);
    }
    if (Array.isArray(values)) {
      for (const value of values) {
        try {
          const address = typeof value === 'string' ? value : value.address;
          const label = typeof value?.label === 'string' ? value.label.slice(0, 100) : undefined;
          const server = serverEntry(address, label);
          entries.set(server.id, server);
          hidden.delete(server.id);
        } catch { /* Ignore invalid entries from older browser data. */ }
      }
    }
    return { entries, hidden };
  }

  function visibleServers({ entries, hidden }) {
    const list = new Map([...configured].filter(([id]) => !hidden.has(id)));
    for (const [id, server] of entries) list.set(id, server);
    return list;
  }

  async function serversFor(request) {
    if (!canManage(request)) return [...configured.values()];
    const cookies = decodeCookies(request);
    const stored = await browserServers.read(cookies.get(browserServerCookie));
    return [...visibleServers(parsePreferences(stored ?? legacyPreferences(cookies))).values()];
  }

  async function resolveServer(request, key) {
    if (typeof key !== 'string') return undefined;
    const matches = entry => [entry.id, entry.endpoint, 'beanstalk://' + entry.endpoint].includes(key);
    const browserServer = (await serversFor(request)).find(matches);
    if (browserServer) return browserServer;

    const configuredServer = [...configured.values()].find(matches);
    if (configuredServer) return configuredServer;

    for (const stored of await sharedServers.read()) {
      const entry = serverEntry(stored.endpoint, stored.label);
      if (matches(entry)) return configured.get(entry.id) || entry;
    }

    if (canManage(request) && request.get('Sec-Fetch-Site') !== 'cross-site' && directEndpointPattern.test(key)) {
      try {
        return { ...serverEntry(key), direct: true };
      } catch {
        // Leave invalid addresses unresolved.
      }
    }
  }

  function publicServer({ id, label, endpoint, host, port, direct }) {
    return { id, label, endpoint, host, port, personal: !configured.has(id), ...(direct && { direct }) };
  }

  async function updatePreferences(request, response, change, server) {
    const cookies = decodeCookies(request);
    const id = await browserServers.update(cookies.get(browserServerCookie), async stored => {
      const list = parsePreferences(stored ?? legacyPreferences(cookies));
      change(list, visibleServers(list));
      if (server && !configured.has(server.id)) await sharedServers.save(server);
      return {
        entries: [...list.entries.values()].map(({ endpoint, label }) => ({ address: endpoint, label })),
        hidden: [...list.hidden],
      };
    });
    response.cookie(browserServerCookie, id, {
      httpOnly: true, sameSite: 'strict', secure: env.CONSOLE_SECURE_COOKIES === 'true',
      maxAge: 365 * 24 * 60 * 60 * 1000,
    });
    if (cookies.has('console_servers')) response.clearCookie('console_servers');
  }

  function readServer(body) {
    const address = body?.address;
    const label = body?.label ?? '';
    if (typeof address !== 'string' || address.length > 280) fail(400, 'Invalid server address');
    if (typeof label !== 'string' || label.length > 100) fail(400, 'Server name must be at most 100 characters');
    try {
      return serverEntry(address.trim(), label.trim());
    } catch (error) {
      fail(400, error.message);
    }
  }

  function addPreference(list, server, label) {
    list.hidden.delete(server.id);
    const original = configured.get(server.id);
    if (original && (!label?.trim() || original.label === server.label)) list.entries.delete(server.id);
    else list.entries.set(server.id, server);
  }

  function removePreference(list, id) {
    list.entries.delete(id);
    if (configured.has(id)) list.hidden.add(id);
  }

  function validSample(value) {
    if (typeof value?.name !== 'string' || !value.name.trim() || value.name.trim().length > 200
      || typeof value.data !== 'string' || !Array.isArray(value.tubes) || value.tubes.length > 100) {
      fail(400, 'Provide a sample name, payload, and tube names');
    }
    return { name: value.name.trim(), data: value.data, tubes: [...new Set(value.tubes.map(tubeName))] };
  }

  app.disable('x-powered-by');
  app.set('json replacer', (_key, value) => {
    if (typeof value !== 'bigint') return value;
    const number = Number(value);
    return Number.isSafeInteger(number) ? number : String(value);
  });
  api.get('/session', auth.status);
  api.post('/session', auth.checkOrigin, express.json({ limit: '8kb' }), auth.login);
  api.delete('/session', auth.checkOrigin, auth.logout);
  api.use(auth.requireAuth);
  api.use((request, response, next) => {
    response.set('Cache-Control', 'no-store');
    if (!['GET', 'HEAD'].includes(request.method)) {
      if (request.get('Sec-Fetch-Site') === 'cross-site') fail(403, 'Cross-site request denied');
      if (!request.legacyAction && !request.is('application/json')) fail(415, 'Expected application/json');
    }
    next();
  });
  api.use(express.json({ limit: '32mb' }));
  api.get('/servers', async (request, response) => {
    response.json({ servers: (await serversFor(request)).map(publicServer), personalEnabled: canManage(request) });
  });
  api.get('/server-link', async (request, response) => {
    const server = await resolveServer(request, request.query.server);
    if (!server) fail(404, 'Server link is unavailable');
    response.json(publicServer(server));
  });
  api.post('/servers', async (request, response) => {
    if (!canManage(request)) fail(403, 'Server management is disabled');
    const server = readServer(request.body);
    await updatePreferences(request, response, (list, current) => {
      if (current.has(server.id)) fail(409, 'This server is already in the list');
      addPreference(list, server, request.body.label);
    }, server);
    response.status(201).json({ id: server.id });
  });
  api.put('/servers/:serverId', async (request, response) => {
    if (!canManage(request)) fail(403, 'Server management is disabled');
    const id = request.params.serverId;
    const server = readServer(request.body);
    await updatePreferences(request, response, (list, current) => {
      if (!current.has(id)) fail(404, 'Server is not in the browser list');
      if (server.id !== id && current.has(server.id)) fail(409, 'This server is already in the list');
      if (server.id !== id) removePreference(list, id);
      addPreference(list, server, request.body.label);
    }, server);
    response.json({ id: server.id });
  });
  api.delete('/servers/:serverId', async (request, response) => {
    if (!canManage(request)) fail(403, 'Server management is disabled');
    const id = request.params.serverId;
    await updatePreferences(request, response, (list, current) => {
      if (!current.has(id)) fail(404, 'Server is not in the browser list');
      removePreference(list, id);
    });
    response.status(204).end();
  });
  api.param('serverId', async (request, _response, next, id) => {
    request.queueServer = await resolveServer(request, id);
    if (!request.queueServer) fail(404, 'Server unavailable');
    next();
  });

  function queueRoute(operation) {
    return async (request, response) => {
      try {
        response.json(await withQueue(request.queueServer, queue => operation(request, queue)));
      } catch (error) {
        if (error.status) throw error;
        fail(502, error.message);
      }
    };
  }

  api.get('/servers/:serverId/stats', queueRoute(async (_request, queue) => queue.command('stats')));
  api.get('/servers/:serverId/overview', queueRoute(async (_request, queue) => {
    const stats = await queue.command('stats');
    const names = await queue.command('list-tubes');
    const tubes = [];
    for (const name of names) {
      const tube = await queue.command('stats-tube ' + name);
      if (tube.status !== 'NOT_FOUND') tubes.push(tube);
    }
    return { stats, tubes };
  }));
  api.get('/servers/:serverId/tubes/:tube', queueRoute(async (request, queue) => {
    const tube = tubeName(request.params.tube);
    const stats = await queue.command('stats-tube ' + tube);
    if (stats.status === 'NOT_FOUND') fail(404, 'Tube no longer exists');
    await queue.expect('use ' + tube, 'USING');
    const jobs = {};
    for (const state of states) jobs[state] = jobView(await queue.inspect('peek-' + state));
    return { stats, jobs };
  }));
  api.get('/servers/:serverId/jobs/:id', queueRoute(async (request, queue) => {
    const job = await queue.inspect('peek ' + jobId(request.params.id));
    if (!job) fail(404, 'Job no longer exists');
    return jobView(job);
  }));
  api.get('/servers/:serverId/tubes/:tube/search', queueRoute(async (request, queue) => {
    const query = request.query.query;
    if (typeof query !== 'string' || !query.trim() || query.length > 1000) fail(400, 'Enter 1–1000 characters to search');
    const limit = request.query.limit === undefined ? 25 : integer(Number(request.query.limit), 25, 1, 100);
    const from = request.query.from === undefined ? undefined : BigInt(jobId(request.query.from));
    return searchJobs(queue, tubeName(request.params.tube), query, from, limit);
  }));
  api.post('/servers/:serverId/jobs', queueRoute(async (request, queue) => {
    const { tube, payload, encoding, priority, delay, ttr } = request.body || {};
    const target = tubeName(tube);
    if (typeof payload !== 'string' || ![undefined, 'utf8', 'base64'].includes(encoding)) fail(400, 'Invalid payload');
    const data = Buffer.from(payload, encoding || 'utf8');
    if (encoding === 'base64' && data.toString('base64') !== payload) fail(400, 'Invalid Base64 payload');
    return queue.put(target, data, {
      priority: integer(priority, 1024, 0, maxUint),
      delay: integer(delay, 0, 0, maxUint),
      ttr: integer(ttr, 60, 1, maxUint),
    });
  }));
  async function changeJob(request, queue, command, expected) {
    const id = jobId(request.params.id);
    const result = await queue.command(command + ' ' + id);
    if (result.status === 'NOT_FOUND') fail(404, 'Job is missing or no longer in the required state');
    if (result.status !== expected) throw new Error('Unexpected job response: ' + result.status);
    return { id };
  }
  api.delete('/servers/:serverId/jobs/:id', queueRoute((request, queue) => changeJob(request, queue, 'delete', 'DELETED')));
  api.post('/servers/:serverId/jobs/:id/kick', queueRoute((request, queue) => changeJob(request, queue, 'kick-job', 'KICKED')));
  function startJobBatch(action, request, response) {
    const { tubes, targets, limit, batched = false, state: deletionState = 'ready' } = request.body || {};
    const state = action === 'kick' ? 'buried' : deletionState;
    let useBatches = batched;
    let entries;
    let target;
    if (!states.includes(state) && state !== 'all') fail(400, 'Invalid job state');
    if (targets !== undefined || action === 'kick') {
      if (!Array.isArray(targets) || targets.length < 1 || targets.length > 50) fail(400, 'Select 1–50 tubes');
      const names = selectedTubes(targets.map(entry => entry?.tube));
      if (names.length !== targets.length) fail(400, 'Tube limits must be unique');
      entries = targets.map(({ tube, limit }) => ({ tube, target: integer(limit, undefined, 1, Number.MAX_SAFE_INTEGER) }));
      useBatches = true;
    } else {
      const names = selectedTubes(tubes);
      if (typeof batched !== 'boolean' || (batched && names.length !== 1)) fail(400, 'Invalid deletion mode');
      target = integer(limit, 1000, 1, batched ? Number.MAX_SAFE_INTEGER : 1000);
      entries = names.map(tube => ({ tube }));
    }
    const server = request.queueServer;
    const id = randomUUID();
    const operation = {
      id, state, target,
      tubes: entries.map(entry => ({ ...entry, status: 'queued', affected: 0 })),
    };
    jobBatches.set(id, { serverId: server.id, action, operation });

    const tasks = operation.tubes.map(entry => {
      const entryTarget = entry.target ?? target;
      const runBatch = limit => {
        const previous = entry.affected;
        return runTubeAction(server, entry.tube, action, {
          state, limit, onProgress: count => { entry.affected = previous + count; },
        });
      };
      const task = enqueueJobBatch(server.id, entry.tube, async () => {
        entry.status = 'running';
        if (!useBatches) return runBatch(entryTarget);
        const result = await clearJobsInBatches(entryTarget, runBatch, affected => { entry.affected = affected; },
          action === 'kick' ? 'kicking' : 'deleting');
        return {
          affected: result.deleted,
          error: result.error,
          stopped: result.deleted === entryTarget ? 'limit' : undefined,
        };
      });
      if (!task) {
        entry.status = 'skipped';
        return;
      }
      return task.then(
        result => Object.assign(entry, result, { status: result.error || result.stopped === 'timeout' ? 'failed' : 'done' }),
        error => Object.assign(entry, { error: error.message, status: 'failed' }),
      );
    });
    Promise.all(tasks).then(() => {
      setTimeout(() => jobBatches.delete(id), 10 * 60 * 1000).unref();
    });
    response.status(202).json(operation);
  }

  for (const [route, action, label] of [['deletions', 'clear', 'Deletion'], ['kicks', 'kick', 'Kick']]) {
    const path = '/servers/:serverId/' + route;
    api.post(path, (request, response) => startJobBatch(action, request, response));
    api.get(path + '/:id', (request, response) => {
      const entry = jobBatches.get(request.params.id);
      if (!entry || entry.serverId !== request.queueServer.id || entry.action !== action) fail(404, label + ' status is unavailable');
      response.json(entry.operation);
    });
  }

  api.post('/servers/:serverId/tube-actions', async (request, response) => {
    const { action, tubes, state = 'ready', limit, seconds, destination } = request.body || {};
    if (!['pause', 'resume', 'kick', 'clear', 'move', 'bury'].includes(action)) fail(400, 'Invalid tube operation');
    const names = selectedTubes(tubes);
    if (action === 'move' && (names.length !== 1 || names.includes(tubeName(destination)))) fail(400, 'Choose a different destination tube');
    if (!states.includes(state) && state !== (action === 'kick' ? 'any' : action === 'clear' ? 'all' : '')) fail(400, 'Invalid job state');
    if ((action === 'bury' && state !== 'ready') || (action === 'kick' && state === 'ready')) fail(400, 'Job state is incompatible with this operation');
    const options = { state, limit: integer(limit, 100, 1, 1000), seconds: action === 'resume' ? 0 : integer(seconds, 60, 0, maxUint), destination };
    const results = [];
    const deadline = Date.now() + 10000;
    const server = request.queueServer;
    if (action === 'clear') {
      const results = await Promise.all(names.map(async tube => {
        const task = enqueueJobBatch(server.id, tube, () => runTubeAction(server, tube, action, options, deadline));
        if (!task) return { tube, affected: 0, error: 'This tube already has a queued or running deletion' };
        try {
          return { tube, ...await task };
        } catch (error) {
          return { tube, affected: 0, error: error.message };
        }
      }));
      return response.json({ results });
    }
    for (const tube of names) {
      try {
        const result = await runTubeAction(server, tube, action, options, deadline);
        results.push({ tube, ...result });
      } catch (error) {
        results.push({ tube, affected: 0, error: error.message });
      }
    }
    response.json({ results });
  });
  api.get('/samples', async (_request, response) => response.json(await samples.list()));
  async function saveSample(request, response) {
    const result = await samples.save(request.params.id, validSample(request.body));
    if (result.missing) fail(404, 'Sample no longer exists');
    if (result.duplicate) fail(409, 'A sample with this name already exists');
    response.json(result);
  }
  api.post('/samples', saveSample);
  api.put('/samples/:id', saveSample);
  api.delete('/samples/:id', async (request, response) => {
    if (!(await samples.remove(request.params.id))) fail(404, 'Sample no longer exists');
    response.status(204).end();
  });
  api.use((_request, response) => response.status(404).json({ error: 'API route not found' }));
  app.post(['/', '/beanstalk/'], auth.requireAuth, express.urlencoded({ extended: false, limit: '32mb' }), express.json({ limit: '32mb' }),
    legacyActions({ api, serversFor, resolveServer, samples }));
  app.use(['/api', '/beanstalk/api'], api);
  const dist = resolve('dist');
  app.get(/^\/beanstalk$/, (request, response) => response.redirect(308, '/beanstalk/' + request.url.slice('/beanstalk'.length)));
  app.get(/^\/(?:beanstalk\/)?index\.php$/, (request, response) => response.redirect(308, request.url.replace('index.php', '')));
  const staticFiles = express.static(dist, { index: false });
  app.use('/beanstalk', staticFiles);
  app.use(staticFiles);
  app.get(['/favicon.ico', '/beanstalk/favicon.ico'],
    (_request, response) => response.redirect(302, './favicon.png'));
  app.get(['/', '/beanstalk/'], (_request, response) => response.sendFile(join(dist, 'index.html')));
  app.use((error, _request, response, _next) => {
    const status = error.status || 500;
    if (status === 500) console.error(error);
    response.status(status).json({ error: status === 500 ? 'Internal console error' : error.message });
  });
  return app;
}
