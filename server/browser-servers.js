import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const idPattern = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;

export function browserServerStore(directory) {
  const writes = new Map();

  async function read(id) {
    if (!idPattern.test(id ?? '')) return null;
    try {
      return JSON.parse(await readFile(join(directory, id + '.json'), 'utf8'));
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }

  async function write(id, document) {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const path = join(directory, id + '.json');
    const temporary = path + '.' + randomUUID() + '.tmp';
    try {
      await writeFile(temporary, JSON.stringify(document), { mode: 0o600, flag: 'wx' });
      await rename(temporary, path);
    } finally {
      await rm(temporary, { force: true });
    }
  }

  return {
    read,
    async update(id, change) {
      const key = idPattern.test(id ?? '') ? id : randomUUID();
      const task = (writes.get(key) ?? Promise.resolve()).then(async () => {
        const previous = await read(id);
        const resultId = previous ? id : randomUUID();
        await write(resultId, await change(previous));
        return resultId;
      });
      const pending = task.catch(() => {});
      writes.set(key, pending);
      try {
        return await task;
      } finally {
        if (writes.get(key) === pending) writes.delete(key);
      }
    },
  };
}
