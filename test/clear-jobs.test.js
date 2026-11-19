import assert from 'node:assert/strict';
import test from 'node:test';
import { clearJobsInBatches } from '../src/lib/clear-jobs.js';

test('caps deletion at the confirmed count even when every batch still has jobs', async () => {
  const requests = [];
  const progress = [];
  const result = await clearJobsInBatches(2431, async limit => {
    requests.push(limit);
    return { affected: limit, stopped: 'limit' };
  }, count => progress.push(count));

  assert.deepEqual(requests, [1000, 1000, 431]);
  assert.deepEqual(progress, [1000, 2000]);
  assert.deepEqual(result, { deleted: 2431 });
});

test('stops early when there are no matching jobs left', async () => {
  const result = await clearJobsInBatches(2000, async () => ({ affected: 7 }), () => assert.fail('unexpected next batch'));
  assert.deepEqual(result, { deleted: 7, exhausted: true });
});

test('preserves partial counts and stops after a batch makes no progress', async () => {
  const batches = [{ affected: 500, stopped: 'timeout' }, { affected: 0, stopped: 'timeout' }];
  const result = await clearJobsInBatches(2000, async () => batches.shift(), () => {});
  assert.deepEqual(result, { deleted: 500, error: 'The batch stopped without deleting any jobs.' });
  assert.equal(batches.length, 0);
});

test('reports confirmed deletions without retrying a failed request', async () => {
  let calls = 0;
  const result = await clearJobsInBatches(2000, async () => {
    if (++calls === 1) return { affected: 1000, stopped: 'limit' };
    throw new Error('Connection lost');
  }, () => {});
  assert.deepEqual(result, { deleted: 1000, error: 'Connection lost' });
  assert.equal(calls, 2);
});
