import { withQueue } from './beanstalk.js';
import { jobView } from './operations.js';

const route = (...parts) => '/' + parts.map(encodeURIComponent).join('/');
const number = value => value === '' || value == null ? undefined : Number(value);
const array = value => value === undefined ? [] : Array.isArray(value) ? value : [value];

function tubeList(body) {
  if (body.tubes || body['tubes[]']) return array(body.tubes || body['tubes[]']);
  return Object.keys(body).filter(key => key.startsWith('tubes[') && key.endsWith(']')).map(key => key.slice(6, -1));
}

export function legacyActions({ api, serversFor, resolveServer, samples }) {
  return async (request, response, next) => {
    const { action, server, tube, state, count, jobid, key, destTube, destState, removeServer } = request.query;
    if (!request.is(['application/json', 'application/x-www-form-urlencoded'])) return response.status(415).json({ error: 'Unsupported action encoding' });
    const origin = request.get('Origin');
    const site = request.get('Sec-Fetch-Site');
    if (site === 'cross-site' || (origin && (!URL.canParse(origin) || new URL(origin).host !== request.get('Host')))) {
      return response.status(403).json({ error: 'Cross-site request denied' });
    }
    const body = request.body || {};
    const servers = serversFor(request);
    const target = value => servers.find(item => [item.endpoint, item.id, 'beanstalk://' + item.endpoint].includes(value));
    const targetServer = server ? await resolveServer(request, server) : undefined;
    const queue = (...parts) => route('servers', targetServer?.direct ? targetServer.endpoint : targetServer?.id || '', ...parts);
    let path;
    let method = 'POST';
    let data;
    let resultShape;
    const bulk = (operation, names, options) => {
      path = queue('tube-actions');
      data = { action: operation, tubes: names, ...options };
    };

    switch (action) {
      case 'addjob':
        path = queue('jobs');
        data = { tube: body.tubeName || tube, payload: body.tubeData, encoding: body.encoding,
          priority: number(body.tubePriority), delay: number(body.tubeDelay), ttr: number(body.tubeTtr) };
        resultShape = value => ({ result: true, ...value });
        break;
      case 'kickJob':
        path = queue('jobs', jobid, 'kick');
        break;
      case 'deleteJob':
        path = queue('jobs', jobid);
        method = 'DELETE';
        break;
      case 'kick': {
        if (!targetServer) return response.status(404).json({ error: 'Server unavailable' });
        const limit = number(count) ?? 1;
        if (limit === 0) return response.json({ results: [{ tube, affected: 0 }] });
        bulk('kick', [tube], { state: body.state || 'any', limit });
        break;
      }
      case 'pause': {
        const seconds = Number(count);
        bulk(seconds === 0 ? 'resume' : 'pause', [tube], { seconds: seconds < 0 ? number(body.seconds) ?? 3600 : seconds });
        break;
      }
      case 'delete':
      case 'deleteAll':
        bulk('clear', [tube], { state, limit: action === 'delete' ? 1 : number(body.limit) ?? 1000 });
        break;
      case 'clearTubes':
        bulk('clear', tubeList(body).length ? tubeList(body) : Object.keys(body), { state: 'all', limit: 1000 });
        resultShape = value => ({ result: !value.results.some(item => item.error || item.stopped), ...value });
        break;
      case 'tubeBulk':
        bulk(body.operation, tubeList(body), {
          state: body.operation === 'kick' ? 'buried' : 'ready',
          limit: body.kick_mode === 'all' ? 1000 : number(body.count),
          seconds: number(body.seconds) ?? 3600,
        });
        resultShape = value => ({ results: value.results.map(item => ({
          ...item, success: !item.error, kicked: body.operation === 'kick' ? item.affected : undefined, message: item.error,
        })) });
        break;
      case 'moveJobsTo':
        bulk(destState === 'buried' ? 'bury' : 'move', [tube], { state, destination: destTube, limit: 1000 });
        break;
      case 'loadSample': {
        if (!targetServer) return response.status(404).json({ error: 'Server unavailable' });
        const sample = (await samples.list()).find(item => item.id === key);
        if (!sample) return response.status(404).json({ error: 'Sample no longer exists' });
        path = queue('jobs');
        data = { tube, payload: sample.data };
        break;
      }
      case 'addSample': {
        if (!targetServer) return response.status(404).json({ error: 'Server unavailable' });
        const id = String(body.addsamplejobid);
        if (!/^[1-9][0-9]{0,19}(?![\s\S])/.test(id) || BigInt(id) > 18446744073709551615n) {
          return response.status(400).json({ error: 'Invalid job ID' });
        }
        const job = await withQueue(targetServer, queue => queue.inspect('peek ' + id)).catch(() => null);
        if (!job || job.stats.tube !== (body.tube || tube)) return response.status(404).json({ error: 'Job no longer exists in the tube' });
        const display = jobView(job);
        if (display.encoding !== 'utf8') return response.status(400).json({ error: 'The job payload is not UTF-8' });
        path = '/samples';
        data = { name: body.addsamplename, data: display.payload, tubes: tubeList(body) };
        resultShape = value => ({ result: true, error: '', ...value });
        break;
      }
      case 'newSample':
      case 'editSample':
        path = action === 'newSample' ? '/samples' : route('samples', key);
        method = action === 'newSample' ? 'POST' : 'PUT';
        data = { name: body.name, data: body.jobdata, tubes: tubeList(body) };
        break;
      case 'deleteSample':
        path = route('samples', key);
        method = 'DELETE';
        break;
      case 'serversRemove': {
        const selected = target(removeServer);
        if (!selected) return response.status(404).json({ error: 'Server unavailable' });
        path = route('servers', selected.id);
        method = 'DELETE';
        break;
      }
      default:
        return next();
    }

    if (server && !targetServer) return response.status(404).json({ error: 'Server unavailable' });
    if (resultShape) {
      const send = response.json.bind(response);
      response.json = value => send(response.statusCode < 400 ? resultShape(value) : value);
    }
    request.legacyAction = true;
    request.url = path;
    request.method = method;
    request.body = data ?? {};
    return api(request, response, next);
  };
}
