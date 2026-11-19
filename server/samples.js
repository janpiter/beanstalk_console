import { createHash, randomUUID } from 'node:crypto';
import { readFile, rename, rm, writeFile } from 'node:fs/promises';

export function sampleStore(path) {
  let pending = Promise.resolve();

  async function read() {
    try {
      const input = await readFile(path, 'utf8');
      const document = input.trim() ? JSON.parse(input) : {};
      if (!document || typeof document !== 'object' || Array.isArray(document)) {
        throw new Error('Invalid sample storage format');
      }
      return document;
    } catch (error) {
      if (error.code === 'ENOENT') return {};
      throw error;
    }
  }

  function update(transform) {
    const task = pending.then(async () => {
      const document = await read();
      const jobs = Object.assign(Object.create(null), document['1']?.jobs);
      const result = transform(jobs);
      const tubes = Object.create(null);
      for (const [id, sample] of Object.entries(jobs)) {
        for (const tube of Object.keys(sample.tubes || {})) {
          (tubes[tube] ??= Object.create(null))[id] = '';
        }
      }
      document['1'] = { ...document['1'], jobs, tubes };
      const temporaryPath = path + '.' + randomUUID() + '.tmp';
      try {
        await writeFile(temporaryPath, JSON.stringify(document), { mode: 0o600, flag: 'wx' });
        await rename(temporaryPath, path);
      } finally {
        await rm(temporaryPath, { force: true });
      }
      return result;
    });
    pending = task.catch(() => {});
    return task;
  }

  return {
    async list() {
      const document = await read();
      return Object.entries(document['1']?.jobs || {}).map(([id, sample]) => ({
        ...sample, id, tubes: Object.keys(sample.tubes || {}),
      }));
    },
    save(oldId, { name, data, tubes }) {
      return update(jobs => {
        if (oldId && !jobs[oldId]) return { missing: true };
        const id = createHash('md5').update(name).digest('hex');
        if (jobs[id] && id !== oldId) return { duplicate: true };
        if (oldId && oldId !== id) delete jobs[oldId];
        jobs[id] = { name, data, tubes: Object.fromEntries(tubes.map(tube => [tube, tube])) };
        return { id };
      });
    },
    remove(id) {
      return update(jobs => Object.hasOwn(jobs, id) && delete jobs[id]);
    },
  };
}
