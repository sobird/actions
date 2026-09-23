import { parse, stringify } from 'yaml';

import logger from '@/common/logger';
import {
  sequelize,
  ActionRun,
  ActionRunAttempt,
  ActionRunAttemptJobIdIndex,
  type ActionRunCreationAttributes,
  ActionRunIndex,
  ActionRunJob,
  ActionTaskVersion,
} from '@/models';
import { Status } from '@/models/actions/status';
import { ellipsisDisplayString } from '@/utils';
import WorkflowPlanner from '@/workflow/planner';

import { prepareToStartJobWithConcurrency, prepareToStartRunWithConcurrency } from './clear_tasks';
import { evaluateJobConcurrencyFillModel, evaluateRunConcurrencyFillModel } from './concurrency';

/** Normalize `runs-on` into the flat label list a runner is matched against. */
export function normalizeRunsOn(source: unknown): string[] {
  if (!source) {
    return [];
  }
  if (typeof source === 'string') {
    return [source];
  }
  if (Array.isArray(source)) {
    return source.map(String);
  }

  const { group, labels } = source as { group?: string; labels?: string | string[] };
  const result: string[] = [];
  if (typeof labels === 'string') {
    result.push(labels);
  } else if (Array.isArray(labels)) {
    result.push(...labels.map(String));
  }
  if (group) {
    result.push(group);
  }
  return result;
}

/** Parse a JSON-encoded string list column, tolerating a plain string. */
export function parseStringList(value: unknown): string[] {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.map(String);
  }
  if (typeof value !== 'string') {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [value];
  } catch {
    return [value];
  }
}

/**
 * The top-level keys a single-job payload keeps.
 *
 * Mirrors act's `jobparser.SingleWorkflow`, which deliberately drops
 * `concurrency`: the server resolves it into database columns instead.
 */
const SINGLE_WORKFLOW_KEYS = new Set(['name', 'on', 'env', 'jobs', 'defaults', 'permissions', 'run-name']);

/** `(v1, v2)`, values taken in key order — mirrors jobparser's `matrixName`. */
function matrixName(matrix: Record<string, unknown>): string {
  const values = Object.keys(matrix)
    .toSorted()
    .map((key) => String(matrix[key]));
  return `(${values.join(', ')})`;
}

/**
 * Name one matrix cell, mirroring jobparser's `nameWithMatrix`.
 *
 * A name holding an expression is left alone: the runner interpolates it once it
 * has the contexts, while the server only ever sees the raw string.
 */
function nameWithMatrix(name: string, matrix: Record<string, unknown>): string {
  if (Object.keys(matrix).length === 0) {
    return name;
  }
  if (!name.includes('${{') || !name.includes('}}')) {
    return `${name} ${matrixName(matrix)}`;
  }
  return name;
}

/**
 * `continue-on-error` only counts when it is a literal boolean.
 *
 * Upstream evaluates the field while parsing, because its parser owns the
 * expression contexts; ours live on the runner, which reads the field from the
 * payload it is given.
 */
function literalContinueOnError(job: Record<string, unknown> | undefined): boolean {
  return typeof job?.['continue-on-error'] === 'boolean' ? Boolean(job['continue-on-error']) : false;
}

/**
 * Serialize one matrix cell as the payload its runner sees: a workflow holding
 * that job alone, with `needs` erased and the matrix pinned to the cell.
 *
 * Mirrors act's `jobparser.Parse` → `SetJob` (single job) → `EraseNeeds` →
 * `encodeMatrix` (one value per key; an empty cell writes no matrix at all).
 */
export function buildJobPayload(
  workflow: Record<string, any>,
  jobId: string,
  matrix: Record<string, unknown>,
): { payload: Buffer; name: string } {
  const job = structuredClone(workflow.jobs[jobId]);

  // `needs` is resolved against the run's other jobs, which this payload does not
  // carry, so the dependency could never be satisfied from inside it.
  delete job.needs;

  const name = nameWithMatrix(String(job.name || jobId), matrix);
  job.name = name;
  if (Object.keys(matrix).length > 0) {
    job.strategy = {
      ...job.strategy,
      matrix: Object.fromEntries(Object.entries(matrix).map(([key, value]) => [key, [value]])),
    };
  } else if (job.strategy) {
    // An empty cell writes no matrix, and a matrix whose cells were all excluded
    // resolves to exactly that. Leaving the original list behind would let the
    // runner expand cells the run no longer has.
    delete job.strategy.matrix;
  }

  const single: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(workflow)) {
    if (key === 'jobs') {
      single.jobs = { [jobId]: job };
    } else if (SINGLE_WORKFLOW_KEYS.has(key)) {
      single[key] = value;
    }
  }

  return { payload: Buffer.from(stringify(single)), name };
}

/**
 * The part of a run row that its trigger, and not its content, decides.
 *
 * Derived from the model's creation attributes, so a column added to the model reaches every
 * entry point at once instead of having to be copied into each one. The columns the insert
 * resolves itself are taken out, as are the ones the database lifecycle owns. Note the columns
 * that carry a model-level default stay optional here: the compiler will not make an entry
 * state them.
 */
export type RunSeed = Omit<
  ActionRunCreationAttributes,
  | 'id'
  | 'index'
  | 'status'
  | 'rawConcurrency'
  | 'version'
  | 'previousDuration'
  | 'startedAt'
  | 'stoppedAt'
  | 'duration'
  | 'latestAttemptId'
  | 'workflowId'
  | 'title'
> & {
  /** defaults to the parsed workflow's `name`, then its file, then `workflow` */
  workflowId?: string;
  /** defaults to the resolved `workflowId` */
  title?: string;
};

/**
 * Create a run, one run attempt, and one job per job and matrix cell.
 *
 * Mirrors gitea's `services/actions/run.go` `PrepareRunAndInsert`: the entry point hands over
 * the raw content plus the trigger context it assembled, and everything the content itself
 * decides — the run index, the per-cell payloads, the concurrency groups — is resolved here.
 * Only waiting jobs wake the runners up.
 */
export async function prepareRunAndInsert(content: string, seed: RunSeed) {
  const planner = WorkflowPlanner.Single(content);
  const workflow = planner.workflows[0];
  const jobEntries = Object.entries(workflow.jobs ?? {});
  if (jobEntries.length === 0) {
    throw new Error('workflow has no jobs');
  }

  const source = parse(content) as Record<string, any>;

  const { ownerId, repositoryId, commitSha } = seed;
  const workflowId = seed.workflowId || workflow.name || workflow.file || 'workflow';
  const title = seed.title || workflowId;

  // One transaction for the whole insert: a half-created run must not burn a run
  // index, and the runners must never see a job before its run exists.
  const created = await sequelize.transaction(async (transaction) => {
    const index = await ActionRunIndex.getNext(repositoryId, transaction);

    // `concurrency:` with no value parses to null, and upstream's nil check skips it.
    const runConcurrency: unknown = source.concurrency;
    const declaresRunConcurrency = runConcurrency !== undefined && runConcurrency !== null;

    // Whatever the seed carries lands as written; only these five columns are the core's to set.
    const run = await ActionRun.create(
      {
        ...seed,
        title: ellipsisDisplayString(title, 255),
        workflowId,
        index,
        status: Status.Waiting,
        rawConcurrency: declaresRunConcurrency ? JSON.stringify(runConcurrency) : '',
      },
      { transaction },
    );

    const runAttempt = ActionRunAttempt.build({
      runId: run.id,
      repositoryId,
      attempt: 1,
      triggerUserId: 0,
      status: Status.Waiting,
      concurrencyGroup: '',
      concurrencyCancel: false,
    });

    // The workflow level never reads `needs`, so its group resolves here and now; a node
    // that cannot be read at all fails the run, which is where upstream lets it land.
    if (declaresRunConcurrency) {
      if (!evaluateRunConcurrencyFillModel(runAttempt, run.rawConcurrency)) {
        throw new Error(`run ${run.id}: workflow concurrency cannot be read`);
      }
      // A group another run already holds leaves every job of this run blocked with it.
      runAttempt.status = await prepareToStartRunWithConcurrency(runAttempt, transaction);
    }

    await runAttempt.save({ transaction });

    run.latestAttemptId = runAttempt.id;
    await run.save({ transaction });

    const workflowSourceRepoId = run.workflowRepoId ?? 0;
    const workflowSourceCommitSha = run.workflowCommitSha ?? '';

    const runJobs: ActionRunJob[] = [];
    let hasWaitingJobs = false;

    for (const [jobId, job] of jobEntries) {
      const needs = job.Needs;
      const jobConcurrency: unknown = source.jobs?.[jobId]?.concurrency;
      const declaresJobConcurrency = jobConcurrency !== undefined && jobConcurrency !== null;
      const cells: Record<string, unknown>[] = job.strategy.Matrices;
      // act always yields at least one cell: a job without a matrix runs once.
      const matrixes = (cells.length > 0 ? cells : [{}]).map((matrix) => ({ matrix, name: matrixName(matrix) }));
      // Parse order, which is also the order the jobs are dispatched in.
      matrixes.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

      const continueOnError = literalContinueOnError(source.jobs?.[jobId]);

      for (const { matrix } of matrixes) {
        const { payload, name } = buildJobPayload(source, jobId, matrix);

        // A job waiting on another job, a run awaiting approval, or a run held back by its
        // own concurrency group must not reach a runner yet; upstream calls the same state
        // blocked, and the job emitter resolves it later.
        const shouldBlockJob = runAttempt.status.isBlocked() || needs.length > 0 || run.needApproval;

        // Cells are handed out in dispatch order, so the first one keeps the lower
        // attempt job id; both awaits here are ordered on purpose.
        // eslint-disable-next-line no-await-in-loop
        const attemptJobId = await ActionRunAttemptJobIdIndex.getNext(run.id, transaction);

        // Built rather than created: a job held to its own group must decide its status
        // before it lands, so that the peers it cancels and the row itself agree.
        const runJob = ActionRunJob.build({
          runId: run.id,
          runAttemptId: runAttempt.id,
          attemptJobId,
          ownerId,
          repositoryId,
          name: ellipsisDisplayString(name, 255),
          commitSha,
          isForkPullRequest: false,
          workflowSourceRepoId,
          workflowSourceCommitSha,
          attempt: 1,
          continueOnError,
          workflowPayload: payload,
          jobId,
          taskId: 0,
          needs: JSON.stringify(needs),
          runsOn: JSON.stringify(normalizeRunsOn(job['runs-on']?.source)),
          status: shouldBlockJob ? Status.Blocked : Status.Waiting,
          startedAt: null,
          stoppedAt: null,
        });

        if (declaresJobConcurrency) {
          runJob.rawConcurrency = JSON.stringify(jobConcurrency);

          // A group that reads other jobs' outputs stays unresolved until those jobs are
          // done, which is the job emitter's job; a node that cannot be read at all fails
          // the run here, as it does upstream.
          if (needs.length === 0 && !evaluateJobConcurrencyFillModel(runJob)) {
            throw new Error(`run ${run.id} job ${jobId}: concurrency cannot be read`);
          }

          // Only a job that would start is held to its group; a blocked one is left to the
          // emitter, which resolves it once its needs are done.
          if (runJob.status.isWaiting()) {
            // eslint-disable-next-line no-await-in-loop
            runJob.status = await prepareToStartJobWithConcurrency(runJob, transaction);
          }
        }

        // eslint-disable-next-line no-await-in-loop
        await runJob.save({ transaction });

        hasWaitingJobs ||= runJob.status.isWaiting();
        runJobs.push(runJob);
      }
    }

    runAttempt.status = ActionRunJob.aggregateStatus(runJobs);
    await runAttempt.save({ transaction });

    // Idle runners compare their cached version against the latest one; without a
    // bump they would never notice the new jobs.
    if (hasWaitingJobs) {
      await ActionTaskVersion.increaseVersion(ownerId, repositoryId, transaction);
    }

    return { run, jobs: runJobs };
  });

  logger.info(`Created run ${created.run.id} with ${created.jobs.length} job(s)`);

  return created;
}
