const batchSize = 1000;
const parallelTubes = 3;

export function createDeletionQueue() {
  const servers = new Map();

  return function enqueue(serverId, tube, run) {
    if (!servers.has(serverId)) servers.set(serverId, { active: 0, tubes: new Set(), waiting: [] });
    const server = servers.get(serverId);
    if (server.tubes.has(tube)) return null;
    server.tubes.add(tube);

    function dispatch() {
      while (server.active < parallelTubes && server.waiting.length) {
        const start = server.waiting.shift();
        server.active++;
        start();
      }
    }

    return new Promise((resolve, reject) => {
      server.waiting.push(() => {
        Promise.resolve().then(run).finally(() => {
          server.active--;
          server.tubes.delete(tube);
          if (!server.tubes.size) servers.delete(serverId);
          else dispatch();
        }).then(resolve, reject);
      });
      dispatch();
    });
  };
}

export async function clearJobsInBatches(target, clearBatch, reportProgress) {
  let deleted = 0;
  while (deleted < target) {
    let result;
    try {
      result = await clearBatch(Math.min(batchSize, target - deleted));
    } catch (error) {
      return { deleted, error: error.message };
    }
    deleted += result.affected;
    if (result.error) return { deleted, error: result.error };
    if (deleted === target) return { deleted };
    if (!result.stopped) return { deleted, exhausted: true };
    if (!result.affected) return { deleted, error: 'The batch stopped without deleting any jobs.' };
    reportProgress(deleted);
  }
  return { deleted };
}
