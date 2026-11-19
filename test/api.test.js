import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createConnection, createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { setTimeout } from 'node:timers/promises';
import { createApp } from '../server/app.js';
import { withQueue } from '../server/beanstalk.js';

async function localServer(server) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return server.address().port;
}

async function fixture(t, config = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'beanstalk-console-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const file = join(dir, 'storage.json');
  const server = createApp({ SAMPLE_STORAGE: file, ...config }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = 'http://127.0.0.1:' + server.address().port + '/api';
  async function call(path, method = 'GET', data = {}, headers = {}) {
    const res = await fetch(base + path, {
      method,
      headers: { ...(method !== 'GET' && { 'Content-Type': 'application/json' }), ...headers },
      ...(method !== 'GET' && { body: JSON.stringify(data) }),
    });
    return { status: res.status, data: res.status === 204 ? null : await res.json(), headers: res.headers };
  }
  async function legacy(path, fields, headers = {}) {
    const response = await fetch(new URL(path, base), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...headers },
      body: new URLSearchParams(fields),
    });
    return { status: response.status, data: response.status === 204 ? null : await response.json() };
  }
  return { call, file, legacy, origin: new URL(base).origin };
}

test('loads legacy samples and serializes concurrent edits without dropping data', async t => {
  const { file, call } = await fixture(t);
  const id = 'b2d9769930de7a5dd4df84fe4602a456';
  const payload = 'héllo\r\nworld';
  await writeFile(file, JSON.stringify({
    1: { jobs: { [id]: { name: 'Legacy sample', data: payload, tubes: { events: 'events' } } },
      tubes: { events: { [id]: '' } } },
  }));

  assert.deepEqual((await call('/samples')).data, [{ id, name: 'Legacy sample', data: payload, tubes: ['events'] }]);
  const sample = { name: 'New sample', data: '{}', tubes: ['events'] };
  const responses = await Promise.all([
    call('/samples', 'POST', sample),
    call('/samples', 'POST', sample),
    call('/samples/' + id, 'PUT', { ...sample, name: 'Renamed sample', data: payload }),
  ]);
  assert.deepEqual(responses.slice(0, 2).map(item => item.status).sort(), [200, 409]);
  assert.equal(responses[2].status, 200);
  const saved = JSON.parse(await readFile(file, 'utf8'))['1'];
  assert.equal(Object.keys(saved.jobs).length, 2);
  assert.equal(Object.keys(saved.tubes.events).length, 2);
  assert.equal(saved.jobs[responses[2].data.id].data, payload);
  assert.equal((await call('/samples/' + responses[2].data.id, 'DELETE')).status, 204);
  assert.equal((await call('/samples/' + responses[2].data.id, 'DELETE')).status, 404);
});

test('allows personal server management by default without sign-in', async t => {
  const { call } = await fixture(t, { HOST: '0.0.0.0' });
  assert.equal((await call('/session')).data.enabled, false);
  assert.equal((await call('/servers')).data.personalEnabled, true);
  assert.equal((await call('/servers', 'POST', { address: '127.0.0.1:11301' })).status, 201);
});

test('enforces sign-in when configured and confines personal servers to the browser cookie', async t => {
  const { call } = await fixture(t, { CONSOLE_USERNAME: 'operator', CONSOLE_PASSWORD: 'local-test', ALLOW_PERSONAL_SERVERS: 'true' });
  const headers = { Authorization: 'Basic ' + Buffer.from('operator:local-test').toString('base64') };
  const unauthorized = await call('/servers');
  assert.equal(unauthorized.status, 401);
  assert.equal(unauthorized.headers.has('www-authenticate'), false);
  assert.deepEqual((await call('/session', 'GET', undefined, headers)).data, { enabled: true, authenticated: false });
  const credentials = { username: 'operator', password: 'local-test' };
  assert.equal((await call('/session', 'POST', { ...credentials, password: 'wrong' })).status, 401);
  assert.equal((await call('/session', 'POST', credentials, { Origin: 'https://example.com' })).status, 403);
  const signedIn = await call('/session', 'POST', credentials);
  assert.equal(signedIn.status, 204);
  const sessionCookie = signedIn.headers.get('set-cookie');
  assert.match(sessionCookie, /HttpOnly; SameSite=Strict/i);
  const signedInBrowser = { Cookie: sessionCookie.split(';')[0] };
  assert.equal((await call('/session', 'GET', undefined, signedInBrowser)).data.authenticated, true);
  assert.equal((await call('/servers', 'GET', undefined, signedInBrowser)).status, 200);
  assert.equal((await call('/servers', 'POST', { address: '127.0.0.1:11301' }, { ...signedInBrowser, 'Sec-Fetch-Site': 'cross-site' })).status, 403);
  assert.equal((await call('/session', 'DELETE', {}, signedInBrowser)).status, 204);
  assert.equal((await call('/servers', 'GET', undefined, signedInBrowser)).status, 401);
  const result = await call('/servers', 'POST', { address: '127.0.0.1:11301' }, headers);
  assert.equal(result.status, 201);
  assert.equal((await call('/servers', 'GET', undefined, headers)).data.servers.length, 1);
  const cookie = result.headers.get('set-cookie').split(';')[0];
  const browser = { ...headers, Cookie: cookie };
  assert.equal((await call('/servers', 'GET', undefined, browser)).data.servers.length, 2);
  assert.equal((await call('/servers/' + result.data.id, 'DELETE', {}, browser)).status, 204);
});

test('adds, edits, hides, and restores browser servers on a direct loopback connection', async t => {
  assert.throws(() => createApp({ HOST: '0.0.0.0', ALLOW_PERSONAL_SERVERS: 'local' }), /loopback bind address/);
  const { call, legacy } = await fixture(t, { ALLOW_PERSONAL_SERVERS: 'local' });
  const initial = await call('/servers');
  const [original] = initial.data.servers;
  assert.equal(initial.data.personalEnabled, true);
  assert.equal((await call('/servers', 'GET', undefined, { 'X-Forwarded-For': '10.0.0.2' })).data.personalEnabled, false);
  assert.equal((await call('/servers', 'POST', { address: original.endpoint })).status, 409);

  const cookieFrom = result => ({ Cookie: result.headers.get('set-cookie').split(';')[0] });
  const add = await call('/servers', 'POST', { address: '127.0.0.1:11301', label: 'Added' });
  assert.equal(add.status, 201);
  const addedPath = '/servers/' + add.data.id;
  const edit = await call(addedPath, 'PUT', { address: '127.0.0.1:11302', label: 'Edited' }, cookieFrom(add));
  assert.equal(edit.status, 200);
  const editedBrowser = cookieFrom(edit);
  assert.deepEqual((await call('/servers', 'GET', undefined, editedBrowser)).data.servers.map(item => item.label), [original.label, 'Edited']);
  assert.equal((await call('/server-link?server=127.0.0.1%3A11301')).data.id, add.data.id);
  assert.equal((await call('/server-link?server=127.0.0.1%3A11302')).data.id, edit.data.id);
  assert.equal((await call('/server-link?server=127.0.0.1%3A11399')).data.direct, true);
  assert.equal((await call('/servers/' + edit.data.id, 'DELETE')).status, 404);
  const remove = await call('/servers/' + edit.data.id, 'DELETE', undefined, editedBrowser);
  assert.equal(remove.status, 204);
  assert.deepEqual((await call('/servers', 'GET', undefined, cookieFrom(remove))).data.servers, [original]);

  const renamed = await call('/servers/' + original.id, 'PUT', { address: original.endpoint, label: 'Browser label' });
  assert.equal((await call('/servers', 'GET', undefined, cookieFrom(renamed))).data.servers[0].label, 'Browser label');
  const removedDefault = await call('/servers/' + original.id, 'DELETE', undefined, cookieFrom(renamed));
  assert.equal(removedDefault.status, 204);
  const hiddenBrowser = cookieFrom(removedDefault);
  assert.deepEqual((await call('/servers', 'GET', undefined, hiddenBrowser)).data.servers, []);
  assert.equal((await call('/server-link?server=' + encodeURIComponent(original.endpoint), 'GET', undefined, hiddenBrowser)).data.id, original.id);
  assert.deepEqual((await call('/servers')).data.servers, [original]);

  const restored = await call('/servers', 'POST', { address: original.endpoint }, hiddenBrowser);
  assert.deepEqual((await call('/servers', 'GET', undefined, cookieFrom(restored))).data.servers, [original]);
  const oldCookie = { Cookie: 'beansServers=127.0.0.1%3A11303' };
  const legacyList = await call('/servers', 'GET', undefined, oldCookie);
  assert.equal(legacyList.data.servers[1].endpoint, '127.0.0.1:11303');
  assert.equal((await legacy('/beanstalk/?action=serversRemove&removeServer=127.0.0.1%3A11303', {}, oldCookie)).status, 204);
});

test('migrates server preferences and keeps large lists out of cookies', async t => {
  const { call } = await fixture(t);
  const { servers: [defaultServer] } = (await call('/servers')).data;
  const oldList = {
    entries: Array.from({ length: 8 }, (_, index) => ({ address: 'legacy-' + index, label: 'Legacy ' + index })),
    hidden: [defaultServer.id],
  };
  const oldBrowser = { Cookie: 'console_servers=' + encodeURIComponent(JSON.stringify(oldList)) };
  const add = await call('/servers', 'POST', { address: 'extra-0' }, oldBrowser);
  assert.equal(add.status, 201);
  const cookie = add.headers.get('set-cookie').split(';')[0];
  assert.match(cookie, /^console_server_list=[0-9a-f-]{36}$/);
  const browser = { Cookie: cookie };
  const more = await Promise.all(Array.from({ length: 12 }, (_, index) => call('/servers', 'POST', {
    address: 'extra-' + (index + 1), label: '測'.repeat(100),
  }, browser)));
  assert.ok(more.every(result => result.status === 201));
  const { servers } = (await call('/servers', 'GET', undefined, browser)).data;
  assert.equal(servers.length, 21);
  assert.equal(servers[0].label, 'Legacy 0');
  assert.deepEqual((await call('/servers')).data.servers, [defaultServer]);
});

test('reads fragmented TCP frames and preserves binary delimiters in a job payload', async t => {
  const payload = Buffer.from([0xff, 0x0d, 0x0a, 0, 0xfe]);
  const server = createServer(socket => {
    socket.on('data', async () => {
      socket.write('FOUND 9007199254740995 5\r');
      await setTimeout(15);
      socket.write(Buffer.concat([Buffer.from('\n'), payload.subarray(0, 2)]));
      await setTimeout(15);
      socket.end(Buffer.concat([payload.subarray(2), Buffer.from('\r\n')]));
    });
  });
  const port = await localServer(server);
  t.after(() => new Promise(resolve => server.close(resolve)));
  await withQueue({ host: '127.0.0.1', port }, async queue => {
    const job = await queue.command('peek 9007199254740995');
    assert.equal(job.id, '9007199254740995');
    assert.deepEqual(job.data, payload);
  });
});

test('runs detail and list deletions together with three slots per server and skips overlapping tubes', async t => {
  const parked = new Map();
  const peeked = [];
  const deleted = [];
  const tubes = ['detail', 'first', 'second', 'waiting'];
  const queue = createServer(socket => {
    let tube;
    socket.on('data', chunk => {
      const [command, arg] = chunk.toString().trim().split(' ');
      if (command === 'use') {
        tube = arg;
        socket.write('USING ' + tube + '\r\n');
      } else if (command.startsWith('peek-')) {
        peeked.push([tube, command]);
        parked.set(tube, () => socket.write(`FOUND ${tubes.indexOf(tube) + 1} 1\r\nx\r\n`));
      } else if (command === 'delete') {
        deleted.push(tube);
        socket.write('DELETED\r\n');
      }
    });
  });
  const port = await localServer(queue);
  t.after(() => new Promise(resolve => queue.close(resolve)));
  const endpoint = '127.0.0.1:' + port;
  const { call } = await fixture(t, { BEANSTALK_SERVERS: 'Test=' + endpoint });
  const { servers: [server] } = (await call('/servers')).data;
  const root = '/servers/' + server.id;
  const start = options => call(root + '/deletions', 'POST', { limit: 1, ...options });
  const status = async operation => (await call(root + '/deletions/' + operation.id)).data.tubes;
  async function waitFor(check) {
    const deadline = Date.now() + 2000;
    while (Date.now() < deadline) {
      if (await check()) return;
      await setTimeout(10);
    }
    assert.fail('Deletion did not reach the expected state');
  }

  const detail = await start({ tubes: ['detail'], state: 'buried', batched: true });
  assert.equal(detail.status, 202);
  await waitFor(() => parked.has('detail'));

  const bulk = await start({ tubes, state: 'all' });
  assert.equal(bulk.status, 202);
  await waitFor(() => parked.has('first') && parked.has('second'));
  assert.deepEqual((await status(bulk.data)).map(item => item.status), ['skipped', 'running', 'running', 'queued']);
  assert.deepEqual([...peeked].sort(), [['detail', 'peek-buried'], ['first', 'peek-ready'], ['second', 'peek-ready']]);

  const overlap = await call('/servers/' + encodeURIComponent(endpoint) + '/deletions', 'POST', {
    tubes: ['waiting'], state: 'buried', limit: 1,
  });
  assert.equal(overlap.data.tubes[0].status, 'skipped');
  const legacy = await call(root + '/tube-actions', 'POST', { action: 'clear', tubes: ['detail'], limit: 1 });
  assert.match(legacy.data.results[0].error, /already has a queued or running deletion/);

  parked.get('first')();
  await waitFor(() => parked.has('waiting'));
  assert.equal((await status(detail.data))[0].status, 'running');
  for (const tube of ['detail', 'second', 'waiting']) parked.get(tube)();
  await waitFor(async () => (await status(bulk.data)).slice(1).every(item => item.status === 'done') &&
    (await status(detail.data))[0].status === 'done');
  assert.deepEqual((await status(bulk.data)).map(item => item.affected), [0, 1, 1, 1]);
  assert.equal((await status(detail.data))[0].affected, 1);
  assert.deepEqual(deleted.sort(), [...tubes].sort());
});

test('manages jobs and tubes through the API against an isolated beanstalkd', { skip: !process.env.BEANSTALKD_BIN }, async t => {
  const listener = createServer();
  const port = await localServer(listener);
  await new Promise(resolve => listener.close(resolve));
  const daemon = spawn(process.env.BEANSTALKD_BIN, ['-l', '127.0.0.1', '-p', String(port)], { stdio: 'ignore' });
  const stopped = once(daemon, 'exit');
  stopped.catch(() => {});
  t.after(async () => {
    if (daemon.exitCode === null && daemon.signalCode === null) daemon.kill();
    await stopped;
  });

  for (let attempt = 0; ; attempt++) {
    const connection = createConnection({ host: '127.0.0.1', port });
    try {
      await once(connection, 'connect');
      break;
    } catch (error) {
      if (attempt === 40 || daemon.exitCode !== null || error.code !== 'ECONNREFUSED') throw error;
      await setTimeout(25);
    } finally {
      connection.destroy();
    }
  }

  const { call, file, legacy, origin } = await fixture(t, { BEANSTALK_SERVERS: `Test=127.0.0.1:${port}` });
  const root = '/servers/' + (await call('/servers')).data.servers[0].id;
  const tube = 'queue/example';
  const route = root + '/tubes/' + encodeURIComponent(tube);
  const bulk = (action, options = {}, tubes = [tube]) => call(root + '/tube-actions', 'POST', { action, tubes, ...options });
  const payload = '{"task":"export","title":"café"}\r\n';
  const job = await call(root + '/jobs', 'POST', { tube, payload, priority: 19, ttr: 90 });
  assert.equal(job.status, 200, JSON.stringify(job.data));
  const delayed = await call(root + '/jobs', 'POST', { tube, payload: 'AP8NCg==', encoding: 'base64', delay: 600 });
  assert.equal(delayed.data.state, 'delayed');
  const legacyURL = '/beanstalk/?server=127.0.0.1:' + port;
  const prefixed = await fetch(origin + '/beanstalk/api/servers');
  assert.equal(prefixed.status, 200);
  const phpURL = await fetch(origin + '/beanstalk/index.php?server=127.0.0.1:' + port, { redirect: 'manual' });
  assert.equal(phpURL.headers.get('location'), legacyURL);
  const legacyFields = { tubeName: 'legacy-queue', tubeData: payload, tubePriority: '7', tubeDelay: '0', tubeTtr: '90' };
  const denied = await legacy(legacyURL + '&action=addjob', legacyFields, { Origin: 'https://example.com' });
  assert.equal(denied.status, 403);
  const oldJob = await legacy(legacyURL + '&action=addjob', legacyFields);
  assert.equal(oldJob.status, 200, JSON.stringify(oldJob.data));
  assert.equal(oldJob.data.result, true);
  const checkJob = await call(root + '/jobs/' + oldJob.data.id);
  assert.equal(checkJob.data.stats.pri, 7);
  assert.equal(checkJob.data.payload, payload);
  const getDelete = legacyURL + '&action=deleteJob&tube=legacy-queue&jobid=' + oldJob.data.id;
  await (await fetch(origin + getDelete)).text();
  assert.equal((await call(root + '/jobs/' + oldJob.data.id)).status, 200);
  const saved = await legacy(legacyURL + '&action=addSample&tube=legacy-queue', {
    addsamplejobid: oldJob.data.id, addsamplename: 'Legacy body', tube: 'legacy-queue', 'tubes[legacy-queue]': '1',
  });
  assert.equal(saved.status, 200, JSON.stringify(saved.data));
  assert.deepEqual((await call('/samples')).data.map(item => [item.name, item.tubes]), [['Legacy body', ['legacy-queue']]]);
  assert.equal((await legacy(getDelete, {})).status, 200);
  assert.equal((await call(root + '/jobs/' + oldJob.data.id)).status, 404);

  const legacyPayload = 'a:1:{s:4:"task";s:6:"cafée";}';
  const serialized = await call(root + '/jobs', 'POST', { tube: 'legacy-data', payload: legacyPayload });
  const legacyJob = await call(root + '/jobs/' + serialized.data.id);
  assert.equal(legacyJob.data.payload, legacyPayload);
  assert.equal(legacyJob.data.encoding, 'utf8');
  await call(root + '/jobs/' + serialized.data.id, 'DELETE');
  const invalid = await call(root + '/jobs', 'POST', { tube: tube + '\n', payload });
  assert.equal(invalid.status, 400);

  const before = (await call(route)).data;
  assert.equal(before.jobs.ready.payload, payload);
  assert.equal(before.jobs.delayed.payload, 'AP8NCg==');
  assert.equal(before.jobs.delayed.encoding, 'base64');
  const search = (await call(route + '/search?query=caf%C3%A9')).data;
  assert.equal(search.jobs[0].id, job.data.id);
  assert.ok(search.nextId);
  const pauseTarget = 'pause-second-tube';
  const extra = await call(root + '/jobs', 'POST', { tube: pauseTarget, payload });
  assert.equal(extra.status, 200);
  const directAddress = encodeURIComponent('localhost:' + port);
  const link = '/server-link?server=' + directAddress;
  const direct = await call(link);
  assert.equal(direct.status, 200);
  assert.equal(direct.data.direct, true);
  assert.equal((await call('/servers')).data.servers.length, 1);
  const directOverview = await call('/servers/' + directAddress + '/overview');
  assert.ok(directOverview.data.tubes.some(item => item.name === tube));
  const directTube = await call('/servers/' + directAddress + '/tubes/' + encodeURIComponent(tube));
  assert.equal(directTube.data.jobs.ready.payload, payload);
  assert.equal((await call(link, 'GET', {}, { 'Sec-Fetch-Site': 'cross-site' })).status, 404);
  const restricted = await fixture(t, { ALLOW_PERSONAL_SERVERS: 'false' });
  assert.equal((await restricted.call(link)).status, 404);
  const sharedStore = join(dirname(file), 'shared-servers.json');
  await writeFile(sharedStore, JSON.stringify([{ endpoint: 'localhost:' + port, label: 'Shared link' }]));
  const linkResponse = await fetch(origin + '/beanstalk/api/server-link?server=localhost%3A' + port);
  assert.equal(linkResponse.status, 200);
  const sharedTarget = await linkResponse.json();
  assert.equal(sharedTarget.label, 'Shared link');
  const sharedOverview = await fetch(origin + '/beanstalk/api/servers/' + sharedTarget.id + '/overview');
  assert.equal(sharedOverview.status, 200);
  assert.ok((await sharedOverview.json()).tubes.some(item => item.name === tube));
  const invalidAddress = await fetch(origin + '/beanstalk/api/server-link?server=localhost%3A0');
  assert.equal(invalidAddress.status, 404);
  const selectedTubes = [tube, pauseTarget];
  async function changePause(action) {
    const response = await fetch(origin + '/beanstalk/api' + root + '/tube-actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, tubes: selectedTubes, seconds: 60 }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).results, selectedTubes.map(name => ({ tube: name, affected: 1 })));
  }
  await changePause('pause');
  assert.ok((await call(route)).data.stats['pause-time-left'] > 0);
  assert.ok((await call(root + '/tubes/' + pauseTarget)).data.stats['pause-time-left'] > 0);
  await changePause('resume');
  assert.equal((await call(route)).data.stats['pause-time-left'], 0);
  assert.equal((await call(root + '/tubes/' + pauseTarget)).data.stats['pause-time-left'], 0);
  assert.equal((await call(root + '/jobs/' + extra.data.id, 'DELETE')).status, 200);
  assert.equal((await bulk('bury', { limit: 1 })).data.results[0].affected, 1);
  assert.equal((await call(route)).data.jobs.buried.id, job.data.id);
  assert.equal((await call(root + '/jobs/' + job.data.id + '/kick', 'POST')).status, 200);
  const moved = (await bulk('move', { destination: 'archive', limit: 1 })).data;
  assert.equal(moved.results[0].affected, 1, JSON.stringify(moved));
  const copied = (await call(root + '/tubes/archive')).data.jobs.ready;
  assert.notEqual(copied.id, job.data.id);
  assert.equal(copied.payload, payload);
  assert.equal(copied.stats.pri, 19);
  assert.equal(copied.stats.ttr, 90);
  assert.equal((await call(root + '/jobs/' + job.data.id)).status, 404);
  assert.equal((await bulk('kick', { state: 'delayed', limit: 1 })).data.results[0].affected, 1);
  const deleteURL = origin + '/beanstalk/api' + root + '/jobs/' + copied.id;
  const deleteJob = () => fetch(deleteURL, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  const deleted = await deleteJob();
  assert.equal(deleted.status, 200);
  assert.equal((await deleted.json()).id, copied.id);
  const missing = await deleteJob();
  assert.equal(missing.status, 404);
  assert.equal((await missing.json()).error, 'Job is missing or no longer in the required state');
  assert.equal((await bulk('clear', { state: 'all' })).data.results[0].affected, 1);
  assert.equal((await call(root + '/overview')).data.stats['current-jobs-ready'], 0);
  for (const name of ['true', '0123', '.nan']) {
    assert.equal((await call(root + '/jobs', 'POST', { tube: name, payload })).status, 200);
  }
  assert.deepEqual((await call(root + '/overview')).data.tubes.map(entry => entry.name).sort(),
    ['.nan', '0123', 'default', 'true']);
});
