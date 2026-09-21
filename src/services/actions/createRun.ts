import { parse, stringify } from 'yaml';

import logger from '@/common/logger';
import {
  sequelize,
  ActionRun,
  ActionRunAttempt,
  ActionRunAttemptJobIdIndex,
  ActionRunIndex,
  ActionRunJob,
  ActionTaskVersion,
} from '@/models';
import { Status } from '@/models/actions/status';
import { ellipsisDisplayString } from '@/utils';
import WorkflowPlanner from '@/workflow/planner';

/**
 * A run created from a local workflow has no repository or user behind it, but
 * the models declare both as non-null. They exist only so a run can be scoped
 * and listed; nothing joins against them.
 */
export const DEFAULT_OWNER_ID = 1;
export const DEFAULT_REPOSITORY_ID = 1;

export interface CreateRunOptions {
  /** ref the run is triggered against, e.g. `refs/heads/master` */
  ref?: string;
  commitSha?: string;
  /** which trigger produced the run; manual submissions use workflow_dispatch */
  eventName?: string;
  /** local checkout the job steps should execute in */
  workdir?: string;
  title?: string;
}

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
 * Create a run, one run attempt, and one job per job and matrix cell.
 *
 * Mirrors gitea's `services/actions/run.go` `InsertRun`: the run index comes from
 * a counter table, the jobs are resolved from the workflow into per-cell
 * payloads, and only waiting jobs wake the runners up.
 */
export async function createRunFromWorkflow(workflowPayload: string, options: CreateRunOptions = {}) {
  const { ref = 'refs/heads/master', commitSha = '', eventName = 'workflow_dispatch', workdir = '', title } = options;

  const planner = WorkflowPlanner.Single(workflowPayload);
  const workflow = planner.workflows[0];
  const jobEntries = Object.entries(workflow.jobs ?? {});
  if (jobEntries.length === 0) {
    throw new Error('workflow has no jobs');
  }

  const source = parse(workflowPayload) as Record<string, any>;

  const ownerId = DEFAULT_OWNER_ID;
  const repositoryId = DEFAULT_REPOSITORY_ID;
  const workflowId = workflow.name || workflow.file || 'workflow';

  // One transaction for the whole insert: a half-created run must not burn a run
  // index, and the runners must never see a job before its run exists.
  const created = await sequelize.transaction(async (transaction) => {
    const index = await ActionRunIndex.getNext(repositoryId, transaction);

    const run = await ActionRun.create(
      {
        title: ellipsisDisplayString(title || workflowId, 255),
        ownerId,
        repositoryId,
        workflowId,
        index,
        ref,
        commitSha,
        eventName,
        eventPayload: JSON.stringify({ workdir }),
        triggerEvent: 'manual',
        status: Status.Waiting,
        isForkPullRequest: false,
        needApproval: false,
      },
      { transaction },
    );

    const runAttempt = await ActionRunAttempt.create(
      {
        runId: Number(run.id),
        repositoryId,
        attempt: 1,
        triggerUserId: 0,
        status: Status.Waiting,
        concurrencyGroup: '',
        concurrencyCancel: false,
      },
      { transaction },
    );

    run.latestAttemptId = Number(runAttempt.id);
    await run.save({ transaction });

    const workflowSourceRepoId = Number(run.workflowRepoId ?? 0);
    const workflowSourceCommitSha = run.workflowCommitSha ?? '';

    const runJobs: ActionRunJob[] = [];
    let hasWaitingJobs = false;

    for (const [jobId, job] of jobEntries) {
      const needs = job.Needs;
      const cells: Record<string, unknown>[] = job.strategy.Matrices;
      // act always yields at least one cell: a job without a matrix runs once.
      const matrixes = (cells.length > 0 ? cells : [{}]).map((matrix) => ({ matrix, name: matrixName(matrix) }));
      // Parse order, which is also the order the jobs are dispatched in.
      matrixes.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

      const continueOnError = literalContinueOnError(source.jobs?.[jobId]);

      for (const { matrix } of matrixes) {
        const { payload, name } = buildJobPayload(source, jobId, matrix);

        // A job waiting on another job, or a run awaiting approval, must not reach
        // a runner yet; upstream calls the same state blocked.
        const shouldBlockJob = needs.length > 0 || run.needApproval;

        // Cells are handed out in dispatch order, so the first one keeps the lower
        // attempt job id; both awaits here are ordered on purpose.
        // eslint-disable-next-line no-await-in-loop
        const attemptJobId = await ActionRunAttemptJobIdIndex.getNext(Number(run.id), transaction);

        // eslint-disable-next-line no-await-in-loop
        const runJob = await ActionRunJob.create(
          {
            runId: Number(run.id),
            runAttemptId: Number(runAttempt.id),
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
          },
          { transaction },
        );

        hasWaitingJobs ||= !shouldBlockJob;
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
