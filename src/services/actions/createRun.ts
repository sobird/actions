import logger from '@/common/logger';
import { ActionRun, ActionRunJob, ActionTaskVersion } from '@/models';
import { Status } from '@/models/actions/status';
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
 * Create a run and one job per job in the workflow payload.
 *
 * The payload is the whole workflow file, stored verbatim on every job so a
 * runner can reconstruct the workflow without asking the server for it again.
 */
export async function createRunFromWorkflow(workflowPayload: string, options: CreateRunOptions = {}) {
  const { ref = 'refs/heads/master', commitSha = '', eventName = 'workflow_dispatch', workdir = '', title } = options;

  const planner = WorkflowPlanner.Single(workflowPayload);
  const workflow = planner.workflows[0];
  const jobEntries = Object.entries(workflow.jobs ?? {});
  if (jobEntries.length === 0) {
    throw new Error('workflow has no jobs');
  }

  const ownerId = DEFAULT_OWNER_ID;
  const repositoryId = DEFAULT_REPOSITORY_ID;

  // index is unique per repository, so derive the next one from the current max.
  const latest = await ActionRun.max<number, ActionRun>('index', { where: { repositoryId } });
  const index = Number(latest ?? 0) + 1;

  const run = await ActionRun.create({
    title: title || workflow.name || workflow.file || 'workflow',
    ownerId,
    repositoryId,
    workflowId: workflow.name || workflow.file || 'workflow',
    index,
    ref,
    commitSha,
    eventName,
    eventPayload: JSON.stringify({ workdir }),
    triggerEvent: 'manual',
    status: Status.Waiting,
    isForkPullRequest: false,
    needApproval: false,
  });

  const payload = Buffer.from(workflowPayload);
  const jobs = await ActionRunJob.bulkCreate(
    jobEntries.map(([jobId, job]) => ({
      runId: Number(run.id),
      ownerId,
      repositoryId,
      name: job.name?.source || jobId,
      commitSha,
      isForkPullRequest: false,
      attempt: 1,
      workflowPayload: payload,
      jobId,
      taskId: 0,
      needs: JSON.stringify(job.Needs),
      runsOn: JSON.stringify(normalizeRunsOn(job['runs-on']?.source)),
      status: Status.Waiting,
      started: null,
      stopped: null,
    })),
  );

  // Idle runners compare their cached version against the latest one; without a
  // bump they would never notice the new jobs.
  await ActionTaskVersion.increaseVersion(ownerId, repositoryId);

  logger.info(`Created run ${run.id} with ${jobs.length} job(s)`);

  return { run, jobs };
}
