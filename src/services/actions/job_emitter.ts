import type { Transaction } from 'sequelize';

import { ActionRunJob } from '@/models';
import { Status } from '@/models/actions/status';

import { prepareToStartJobWithConcurrency } from './clear_tasks';
import { evaluateJobConcurrencyFillModel } from './concurrency';
import { parseStringList } from './createRun';

/** The dependency fields the resolution reads. */
export interface DependencyJob {
  jobId: string;
  status: Status;
  continueOnError: boolean;
}

/**
 * A cell that failed for real, which is what its dependents react to.
 *
 * A failure with continue-on-error is treated as a success, matching AggregateJobStatus.
 */
function failedForReal(dependency: DependencyJob): boolean {
  return !dependency.status.isSuccess() && !(dependency.continueOnError && dependency.status.isFailure());
}

/**
 * Whether the jobs named by `needs` let the depending job start.
 *
 * A job expands into one run job per matrix cell, so a dependency only counts as
 * done once every cell of it is done, and as failed only when a cell failed for
 * real. Mirrors gitea's `jobStatusResolver.resolveCheckNeeds`.
 */
export function resolveNeeds(needs: string[], dependencies: DependencyJob[]): 'pending' | 'failed' | 'ready' {
  const dependencyIds = new Set(dependencies.map((dependency) => dependency.jobId));
  // A job that is not in the run at all can never finish, and neither can a cell
  // that has not been inserted yet.
  if (needs.some((needId) => !dependencyIds.has(needId))) {
    return 'pending';
  }
  if (!dependencies.every((dependency) => dependency.status.isDone())) {
    return 'pending';
  }

  return dependencies.some(failedForReal) ? 'failed' : 'ready';
}

/**
 * Resolve the job's own concurrency now that its needs are done, and persist the columns
 * the resolution fills.
 *
 * Port of gitea's `services/actions/job_emitter.go`
 * `updateConcurrencyEvaluationForJobWithNeeds`. The write goes through `ActionRunJob.update`
 * rather than `updateRunJob`: the three columns carry no status, and the aggregate state of
 * the attempt and the run must not be recomputed for a write that changes none of it.
 *
 * A job that declares no concurrency has nothing to resolve, and upstream's write would be
 * a no-op there, so this skips it rather than round-tripping the row.
 */
async function updateConcurrencyEvaluationForJobWithNeeds(
  job: ActionRunJob,
  transaction?: Transaction,
): Promise<boolean> {
  if (job.rawConcurrency === '') {
    return true;
  }
  if (!evaluateJobConcurrencyFillModel(job)) {
    return false;
  }

  await ActionRunJob.update(
    {
      concurrencyGroup: job.concurrencyGroup,
      concurrencyCancel: job.concurrencyCancel,
      isConcurrencyEvaluated: job.isConcurrencyEvaluated,
    },
    { where: { id: job.id }, transaction },
  );

  return true;
}

/**
 * Hand every blocked job of a run the state its dependencies leave it in.
 *
 * Mirrors gitea's `services/actions/job_emitter.go` `checkJobsOfCurrentRunAttempt`: a blocked
 * job whose dependency cells are all done and successful becomes waiting, and one that
 * depends on a cell that failed for real is skipped, so it leaves the queue instead of
 * staying blocked forever. A job that reaches waiting is then held to its own concurrency
 * group, which may keep it blocked after all and cancel the peers it supersedes.
 *
 * Returns whether any of them is waiting now.
 */
export async function resolveBlockedJobs(runId: number, transaction?: Transaction): Promise<boolean> {
  const jobs = await ActionRunJob.findAll({ where: { runId }, transaction });
  const blockedJobs = jobs.filter((job) => job.status.isBlocked());
  if (blockedJobs.length === 0) {
    return false;
  }

  // A job can only be decided once the jobs it depends on are decided, and a
  // workflow declares them in no particular order, so repeat until a pass settles
  // nothing: each pass carries the statuses it wrote in memory into the next one.
  const decided = new Set<number>();
  while (decided.size < blockedJobs.length) {
    let settled = 0;

    for (const job of blockedJobs) {
      if (decided.has(job.id)) {
        continue;
      }

      // Only the cells of the jobs named by `needs` are read: a blocked job is not a
      // dependency of anything, and letting it into the pool would keep every
      // dependent pending forever.
      const needs = parseStringList(job.needs);
      const dependencies = jobs.filter((candidate) => needs.includes(candidate.jobId));

      const verdict = resolveNeeds(needs, dependencies);
      if (verdict === 'pending') {
        continue;
      }

      job.status = verdict === 'failed' ? Status.Skipped : Status.Waiting;
      decided.add(job.id);
      settled += 1;
    }

    if (settled === 0) {
      break;
    }
  }

  let waiting = 0;
  for (const job of blockedJobs) {
    if (job.status.isBlocked()) {
      continue;
    }

    if (job.status.isWaiting()) {
      // Its needs are done, so a group that reads them can be resolved now; the group then
      // decides whether the job may start. A raw concurrency that cannot be read leaves the
      // job blocked, which is where upstream leaves an evaluation it cannot complete.
      // Resolving and starting a job cancels the group peers it supersedes, so the pass stays
      // sequential: what one iteration writes decides what the next one reads.
      /* eslint-disable no-await-in-loop */
      const evaluated = await updateConcurrencyEvaluationForJobWithNeeds(job, transaction);
      job.status = evaluated ? await prepareToStartJobWithConcurrency(job, transaction) : Status.Blocked;
      /* eslint-enable no-await-in-loop */
    }

    if (job.status.isBlocked()) {
      continue; // still waiting on its concurrency group
    }

    // One job per write, guarded by the status this pass read: a concurrent writer that
    // already decided it is not overwritten. Every write carries the aggregate along.
    // eslint-disable-next-line no-await-in-loop
    const affected = await ActionRunJob.updateRunJob(
      job,
      { status: job.status },
      { status: Status.Blocked.toString() },
      transaction,
    );
    if (affected !== 1) {
      throw new Error(`no affected for updating blocked job ${job.id}`);
    }
    if (job.status.isWaiting()) {
      waiting += 1;
    }
  }

  return waiting > 0;
}
