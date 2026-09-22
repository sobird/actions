import type { Transaction } from 'sequelize';

import { ActionRunJob } from '@/models';
import { Status } from '@/models/actions/status';

/**
 * Whether a job has to wait for the concurrency group it names.
 *
 * Port of gitea's `services/actions/clear_tasks.go` `shouldBlockJobByConcurrency`: a job
 * whose raw concurrency is not resolved yet is blocked, because its group may still depend
 * on the jobs it needs; a job whose group already holds a running job is blocked too,
 * unless it cancels the group's peers rather than queueing behind them.
 */
export async function shouldBlockJobByConcurrency(job: ActionRunJob, transaction?: Transaction): Promise<boolean> {
  if (job.rawConcurrency !== '' && !job.isConcurrencyEvaluated) {
    return true;
  }

  if (job.concurrencyGroup === '' || job.concurrencyCancel) {
    return false;
  }

  const [attempts, jobs] = await ActionRunJob.getConcurrentRunAttemptsAndJobs(
    job.repositoryId,
    job.concurrencyGroup,
    [Status.Running, Status.Cancelling],
    transaction,
  );

  return attempts.length > 0 || jobs.length > 0;
}

/**
 * Decide the status a job starts in, and cancel the group peers it supersedes.
 *
 * Port of gitea's `services/actions/clear_tasks.go` `PrepareToStartJobWithConcurrency`,
 * which hands the cancelled jobs back to its caller; nothing local consumes that list,
 * because the cancellation already writes each peer through `updateRunJob`.
 *
 * The peers are cancelled even when the job itself has to wait: a pending peer in the same
 * group is superseded either way, and letting it stay queued would leave it to start later
 * behind the job that replaced it.
 */
export async function prepareToStartJobWithConcurrency(job: ActionRunJob, transaction?: Transaction): Promise<Status> {
  const shouldBlock = await shouldBlockJobByConcurrency(job, transaction);

  await ActionRunJob.cancelPreviousJobsByJobConcurrency(job, transaction);

  return shouldBlock ? Status.Blocked : Status.Waiting;
}
