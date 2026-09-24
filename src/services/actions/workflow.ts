import { prepareRunAndInsert, type RunSeed } from './run';

/**
 * A run created from a local workflow has no repository or user behind it, but
 * the models declare both as non-null. They exist only so a run can be scoped
 * and listed; nothing joins against them.
 */
export const DEFAULT_OWNER_ID = 1;
export const DEFAULT_REPOSITORY_ID = 1;

export interface SubmitOptions {
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
 * The upstream counterpart is `services/actions/workflow.go` `DispatchActionWorkflow`, except that
 * it first resolves the workflow by id (`resolveDispatchWorkflowContent`) and this is handed the
 * content — the request body and the CLI's `submit` command are the same road. The run row, its
 * attempt and its jobs belong to `prepareRunAndInsert`.
 */
export async function submitWorkflow(workflowPayload: string, options: SubmitOptions = {}) {
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
