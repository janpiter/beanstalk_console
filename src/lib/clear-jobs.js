const batchSize = 1000;

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
