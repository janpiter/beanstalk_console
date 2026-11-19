export const states = ['ready', 'delayed', 'buried'];

export function jobView(job) {
  if (!job) return null;
  const payload = job.data.toString('utf8');
  const text = Buffer.from(payload, 'utf8').equals(job.data);
  return {
    id: job.id, stats: job.stats,
    payload: text ? payload : job.data.toString('base64'), encoding: text ? 'utf8' : 'base64',
  };
}

export async function searchJobs(queue, tube, query, start, limit) {
  await queue.expect('use ' + tube, 'USING');
  const heads = new Map();
  for (const state of states) {
    const head = await queue.command('peek-' + state);
    if (head.status === 'FOUND') heads.set(state, BigInt(head.id));
  }
  if (!heads.size) return { jobs: [], scanned: 0, nextId: null };
  let cursor = start ?? [...heads.values()].reduce((minimum, id) => id < minimum ? id : minimum);
  const matches = new Map([...heads.keys()].map(state => [state, []]));
  const finish = nextId => ({ jobs: [...matches.values()].flat(), scanned, nextId });
  let scanned = 0;
  const deadline = Date.now() + 2000;
  while (scanned < 250 && [...matches.values()].some(items => items.length < limit) && Date.now() < deadline) {
    const job = await queue.inspect('peek ' + cursor);
    if (job?.stats.tube === tube) {
      const bucket = matches.get(job.stats.state);
      if (bucket && bucket.length < limit && job.data.includes(query)) bucket.push(jobView(job));
    }
    scanned++;
    cursor++;
    if (cursor > 18446744073709551615n) return finish(null);
  }
  return finish(String(cursor));
}

export async function applyTubeAction(queue, tube, action, { state, limit, seconds, destination, onProgress }, deadline) {
  if (action === 'pause' || action === 'resume') {
    await queue.expect(`pause-tube ${tube} ${seconds}`, 'PAUSED');
    return { affected: 1 };
  }

  await queue.expect('use ' + tube, 'USING');
  if (action === 'kick' && state === 'any') {
    const affected = Number(await queue.expect('kick ' + limit, 'KICKED'));
    return { affected, stopped: affected === limit ? 'limit' : undefined };
  }

  const reserve = action === 'bury' || (action === 'move' && state === 'ready');
  if (reserve) {
    await queue.expect('watch ' + tube, 'WATCHING');
    if (tube !== 'default') await queue.expect('ignore default', 'WATCHING');
  }

  let affected = 0;
  let pendingCopy = null;
  try {
    while (affected < limit && Date.now() < deadline) {
      if (action === 'move' && !reserve) await queue.expect('use ' + tube, 'USING');
      const job = await queue.command(reserve ? 'reserve-with-timeout 0' : 'peek-' + state);
      if (job.status === 'NOT_FOUND' || (reserve && job.status === 'TIMED_OUT')) return { affected };
      if (!['FOUND', 'RESERVED'].includes(job.status)) throw new Error('Unexpected job response: ' + job.status);

      if (action === 'move' || action === 'bury') {
        const stats = await queue.command('stats-job ' + job.id);
        if (stats.status === 'NOT_FOUND' || stats.tube !== tube) continue;
        if (action === 'bury') {
          await queue.expect(`bury ${job.id} ${stats.pri}`, 'BURIED');
        } else {
          if (!reserve && stats.state !== state) continue;
          const copy = await queue.put(destination, job.data, {
            priority: stats.pri, delay: state === 'delayed' ? stats['time-left'] : 0, ttr: stats.ttr,
          });
          pendingCopy = { sourceId: job.id, destinationId: copy.id, destinationState: copy.state };
          await queue.expect('delete ' + job.id, 'DELETED');
          pendingCopy = null;
        }
      } else if (action === 'kick') {
        await queue.expect('kick-job ' + job.id, 'KICKED');
      } else {
        await queue.expect('delete ' + job.id, 'DELETED');
      }
      affected++;
      onProgress?.(affected);
    }
    return { affected, stopped: affected === limit ? 'limit' : 'timeout' };
  } catch (error) {
    return { affected, error: error.message, pendingCopy };
  }
}
