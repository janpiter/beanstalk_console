import { createConnection } from 'node:net';
import { parse } from 'yaml';

const CRLF = Buffer.from('\r\n');
const MAX_FRAME = 32 * 1024 * 1024;
export const tubePattern = /^(?!-)[a-zA-Z0-9+;.$_()/\-]{1,200}(?![\s\S])/;
const errors = new Set([
  'OUT_OF_MEMORY', 'INTERNAL_ERROR', 'BAD_FORMAT', 'UNKNOWN_COMMAND',
  'EXPECTED_CRLF', 'JOB_TOO_BIG', 'DRAINING', 'DEADLINE_SOON',
]);

class Beanstalk {
  constructor(server) {
    this.socket = createConnection({ host: server.host, port: server.port });
    this.socket.setTimeout(3000, () => this.socket.destroy(new Error('Beanstalkd timed out')));
    this.socket.on('error', () => {});
    this.input = this.socket.iterator();
    this.buffer = Buffer.alloc(0);
  }

  async readChunk() {
    const { value, done } = await this.input.next();
    if (done) throw new Error('Beanstalkd closed the connection');
    return value;
  }

  async line() {
    let delimiter = this.buffer.indexOf(CRLF);
    while (delimiter === -1) {
      if (this.buffer.length > 1024) throw new Error('Invalid response header from beanstalkd');
      this.buffer = Buffer.concat([this.buffer, await this.readChunk()]);
      delimiter = this.buffer.indexOf(CRLF);
    }
    if (delimiter > 1024) throw new Error('Invalid response header from beanstalkd');
    const line = this.buffer.subarray(0, delimiter).toString('ascii');
    this.buffer = this.buffer.subarray(delimiter + 2);
    return line;
  }

  async body(size) {
    if (!Number.isInteger(size) || size < 0 || size > MAX_FRAME) {
      throw new Error('Invalid response size from beanstalkd');
    }
    const chunks = [];
    let remaining = size + 2;
    while (remaining > 0) {
      if (this.buffer.length === 0) this.buffer = await this.readChunk();
      const chunk = this.buffer.subarray(0, remaining);
      chunks.push(chunk);
      this.buffer = this.buffer.subarray(chunk.length);
      remaining -= chunk.length;
    }
    const frame = Buffer.concat(chunks, size + 2);
    if (!frame.subarray(size).equals(CRLF)) throw new Error('Invalid response framing from beanstalkd');
    return frame.subarray(0, size);
  }

  async command(command, payload) {
    const header = Buffer.from(command + '\r\n');
    this.socket.write(payload === undefined ? header : Buffer.concat([header, payload, CRLF]));
    const [status, first, second] = (await this.line()).split(' ');
    if (errors.has(status)) throw new Error('Beanstalkd rejected the command: ' + status);
    if (status === 'OK') {
      const body = (await this.body(Number(first))).toString('utf8');
      if (command === 'list-tubes') {
        // Beanstalkd emits unquoted tube names, which YAML can interpret as numbers or booleans.
        const [marker, ...entries] = body.trimEnd().split('\n');
        if (marker !== '---' || entries.some(entry => !entry.startsWith('- ') || !tubePattern.test(entry.slice(2)))) {
          throw new Error('Invalid tube list from beanstalkd');
        }
        return entries.map(entry => entry.slice(2));
      }
      return parse(body, { intAsBigInt: true });
    }
    if (status === 'FOUND' || status === 'RESERVED') {
      return { status, id: first, data: await this.body(Number(second)) };
    }
    return { status, value: first };
  }

  async expect(command, status) {
    const result = await this.command(command);
    if (result.status !== status) throw new Error('Unexpected beanstalkd response: ' + result.status);
    return result.value;
  }

  async inspect(command) {
    const response = await this.command(command);
    if (response.status === 'NOT_FOUND') return null;
    if (response.status !== 'FOUND') throw new Error('Unexpected peek response: ' + response.status);
    const stats = await this.command('stats-job ' + response.id);
    if (stats.status === 'NOT_FOUND') return null;
    return { ...response, stats };
  }

  async put(tube, data, { priority = 1024, delay = 0, ttr = 60 } = {}) {
    await this.expect('use ' + tube, 'USING');
    const result = await this.command(`put ${priority} ${delay} ${ttr} ${data.length}`, data);
    if (!['INSERTED', 'BURIED'].includes(result.status)) throw new Error('Unexpected put response: ' + result.status);
    return { id: result.value, state: result.status === 'BURIED' ? 'buried' : delay > 0 ? 'delayed' : 'ready' };
  }
}

export async function withQueue(server, run) {
  const queue = new Beanstalk(server);
  try {
    return await run(queue);
  } finally {
    queue.socket.destroy();
  }
}
