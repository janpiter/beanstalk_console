import { randomUUID } from 'node:crypto';
import { readFile, rename, rm, writeFile } from 'node:fs/promises';

export function sharedServerStore(path) {
  let pending = Promise.resolve();

  async function read() {
    try {
      const entries = JSON.parse(await readFile(path, 'utf8'));
      if (!Array.isArray(entries)) throw new Error('Invalid shared server storage format');
      return entries;
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  return {
    read,
    save({ endpoint, label }) {
      const task = pending.then(async () => {
        const entries = await read();
        const previous = entries.find(entry => entry.endpoint === endpoint);
        if (previous?.label === label) return;
        const next = entries.filter(entry => entry.endpoint !== endpoint);
        next.push({ endpoint, label });
        const temporary = path + '.' + randomUUID() + '.tmp';
        try {
          await writeFile(temporary, JSON.stringify(next), { mode: 0o600, flag: 'wx' });
          await rename(temporary, path);
        } finally {
          await rm(temporary, { force: true });
        }
      });
      pending = task.catch(() => {});
      return task;
    },
  };
}
