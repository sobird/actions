import type { Transaction } from 'sequelize';

import { ActionRun, ActionRunJob } from '@/models';
import { Status } from '@/models/actions/status';

import { prepareToStartJobWithConcurrency, shouldBlockRunByConcurrency } from './clear_tasks';
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
 * A run that is blocked on a concurrency group and could be let through now.
 *
 * Port of gitea's `services/actions/job_emitter.go` `findConcurrencyWaiterToWake`: the slot
 * has to be free before any waiter can proceed, so a group still holding a running attempt or
 * job has no waiter; otherwise the first blocked run of the group is the one to wake, oldest
 * by whatever order the group query returns. Returns 0 when there is nobody to wake.
 */
async function findConcurrencyWaiterToWake(
  repositoryId: number,
  excludeRunId: number,
  concurrencyGroup: string,
  transaction?: Transaction,
): Promise<number> {
  if (concurrencyGroup === '') {
    return 0;
  }

  const [holderAttempts, holderJobs] = await ActionRunJob.getConcurrentRunAttemptsAndJobs(
    repositoryId,
    concurrencyGroup,
    [Status.Running, Status.Cancelling],
    transaction,
  );
  if (holderAttempts.length > 0 || holderJobs.length > 0) {
    return 0;
  }

  const [blockedAttempts, blockedJobs] = await ActionRunJob.getConcurrentRunAttemptsAndJobs(
    repositoryId,
    concurrencyGroup,
    [Status.Blocked],
    transaction,
  );
  for (const attempt of blockedAttempts) {
    if (attempt.runId !== excludeRunId) {
      return attempt.runId;
    }
  }
  for (const job of blockedJobs) {
    if (job.runId !== excludeRunId) {
      return job.runId;
    }
  }

  return 0;
}

/**
 * Re-resolve the runs blocked on the groups this run was holding.
 *
 * Port of gitea's `services/actions/job_emitter.go` `checkRunConcurrency`, which returns the
 * runs to re-emit and lets the queue do the rest. The groups checked are the run's own
 * (workflow-level) group and the group of each of its jobs that has finished: those are the
 * slots this run's activity could have just freed.
 *
 * `visited` keeps a wake from coming back around to a run already being resolved, which a
 * pair of runs each blocked on a group the other held could otherwise do.
 */
async function wakeConcurrencyWaiters(
  run: ActionRun,
  transaction: Transaction | undefined,
  visited: Set<number>,
): Promise<void> {
  const groups = new Set<string>();

  const attempt = await run.getLatestAttempt({ transaction });
  if (attempt && attempt.concurrencyGroup !== '') {
    groups.add(attempt.concurrencyGroup);
  }

  const jobs = await ActionRunJob.findAll({ where: { runId: run.id }, transaction });
  for (const job of jobs) {
    if (job.status.isDone() && job.concurrencyGroup !== '') {
      groups.add(job.concurrencyGroup);
    }
  }

  for (const group of groups) {
    // eslint-disable-next-line no-await-in-loop
    const waiterRunId = await findConcurrencyWaiterToWake(run.repositoryId, run.id, group, transaction);
    if (waiterRunId === 0 || visited.has(waiterRunId)) {
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    await resolveBlockedJobs(waiterRunId, transaction, visited);
  }
}

/**
 * Hand every blocked job of a run the state its dependencies leave it in.
 *
 * Mirrors gitea's `services/actions/job_emitter.go` `checkJobsOfCurrentRunAttempt`, then the
 * `checkRunConcurrency` that follows it in `EmitJobsIfReadyByRun`: resolving this run may have
 * freed a concurrency group, and the runs waiting on it have to be resolved for their jobs to
 * leave the blocked state.
 *
 * Returns whether any job of this run is waiting now.
 */
export async function resolveBlockedJobs(
  runId: number,
  transaction?: Transaction,
  visited = new Set<number>(),
): Promise<boolean> {
  visited.add(runId);

  const run = await ActionRun.findByPk(runId, { transaction });
  if (!run) {
    throw new Error(`run with id ${runId}: not exist`);
  }

  const waiting = await resolveJobsOfRunAttempt(run, transaction);
  await wakeConcurrencyWaiters(run, transaction, visited);

  return waiting;
}

/**
 * Settle the blocked jobs of a run's latest attempt against their needs and their own
 * concurrency groups. Returns whether any of them is waiting now.
 */
async function resolveJobsOfRunAttempt(run: ActionRun, transaction?: Transaction): Promise<boolean> {
  const jobs = await ActionRunJob.findAll({ where: { runId: run.id }, transaction });
  const blockedJobs = jobs.filter((job) => job.status.isBlocked());
  if (blockedJobs.length === 0) {
    return false;
  }

  // A run held back by its own concurrency group stays that way, jobs and all. The group is
  // only re-checked when the run holding it finishes, through `wakeConcurrencyWaiters`.
  const attempt = await run.getLatestAttempt({ transaction });
  if (run.status.isBlocked() && attempt && (await shouldBlockRunByConcurrency(attempt, transaction))) {
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

      // A caller whose children are already in place is decided by them, not by its own
      // needs: resolving it here would run it as a job of its own.
      if (job.isReusableCaller && job.isExpanded) {
        continue;
      }

      // A child of a caller can only be decided once that caller has expanded. A parent the
      // run does not carry is not waited for, which is how upstream reads the same lookup.
      const parent = job.parentJobId === 0 ? undefined : jobs.find((candidate) => candidate.id === job.parentJobId);
      if (parent && !parent.isExpanded) {
        continue;
      }

      // Only the cells of the jobs named by `needs` are read: a blocked job is not a
      // dependency of anything, and letting it into the pool would keep every
      // dependent pending forever. Needs are resolved within the caller a job was expanded
      // under, so the same job id under two callers does not cross-link.
      const needs = parseStringList(job.needs);
      const dependencies = jobs.filter(
        (candidate) => candidate.parentJobId === job.parentJobId && needs.includes(candidate.jobId),
      );

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
