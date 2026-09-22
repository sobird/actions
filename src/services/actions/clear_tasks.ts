import type { Transaction } from 'sequelize';

import { ActionRun, ActionRunJob, type ActionRunAttempt } from '@/models';
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

/**
 * Whether a run has to wait for the workflow-level concurrency group it names.
 *
 * Port of gitea's `services/actions/clear_tasks.go` `shouldBlockRunByConcurrency`. Unlike the
 * job level there is no unresolved state to account for: the workflow level never reads
 * `needs`, so its group is resolved before anything can ask.
 */
export async function shouldBlockRunByConcurrency(
  attempt: ActionRunAttempt,
  transaction?: Transaction,
): Promise<boolean> {
  if (attempt.concurrencyGroup === '' || attempt.concurrencyCancel) {
    return false;
  }

  const [attempts, jobs] = await ActionRunJob.getConcurrentRunAttemptsAndJobs(
    attempt.repositoryId,
    attempt.concurrencyGroup,
    [Status.Running, Status.Cancelling],
    transaction,
  );

  return attempts.length > 0 || jobs.length > 0;
}

/**
 * Decide the status a run's attempt starts in, and cancel the group peers it supersedes.
 *
 * Port of gitea's `services/actions/clear_tasks.go` `PrepareToStartRunWithConcurrency`. The
 * peers are cancelled even when the run itself has to wait, for the same reason as the job
 * level: a pending peer in the group is superseded either way.
 */
export async function prepareToStartRunWithConcurrency(
  attempt: ActionRunAttempt,
  transaction?: Transaction,
): Promise<Status> {
  const shouldBlock = await shouldBlockRunByConcurrency(attempt, transaction);

  await ActionRun.cancelPreviousJobsByRunConcurrency(attempt, transaction);

  return shouldBlock ? Status.Blocked : Status.Waiting;
}
