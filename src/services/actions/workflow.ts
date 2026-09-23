import { prepareRunAndInsert, type RunSeed } from './run';

/**
 * A run created from a local workflow has no repository or user behind it, but
 * the models declare both as non-null. They exist only so a run can be scoped
 * and listed; nothing joins against them.
 */
export const DEFAULT_OWNER_ID = 1;
export const DEFAULT_REPOSITORY_ID = 1;

export interface DispatchOptions {
  /** ref the run is triggered against, e.g. `refs/heads/master` */
  ref?: string;
  commitSha?: string;
  /** which trigger produced the run; manual submissions use workflow_dispatch */
  eventName?: string;
  /** local checkout the job steps should execute in */
  workdir?: string;
  title?: string;
}

/**
 * Queue a run from a workflow supplied by the caller.
 *
 * Mirrors gitea's `services/actions/workflow.go` `DispatchActionWorkflow`, minus the repository,
 * ref and permission checks it does first: this is the manual trigger's entry, and its whole job
 * is turning the trigger context into a run seed. The run row, its attempt and its jobs belong to
 * `prepareRunAndInsert`.
 */
export async function dispatchWorkflow(workflowPayload: string, options: DispatchOptions = {}) {
  const { ref = 'refs/heads/master', commitSha = '', eventName = 'workflow_dispatch', workdir = '', title } = options;

  const seed: RunSeed = {
    ownerId: DEFAULT_OWNER_ID,
    repositoryId: DEFAULT_REPOSITORY_ID,
    title,
    ref,
    commitSha,
    eventName,
    eventPayload: JSON.stringify({ workdir }),
    triggerEvent: 'manual',
  };

  return prepareRunAndInsert(workflowPayload, seed);
}
