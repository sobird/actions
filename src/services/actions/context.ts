/**
 * Server-side GitHub context.
 *
 * The server resolves the context itself, from the run's own columns plus its event
 * payload, and both the insert path (which interpolates each matrix cell's `runs-on`)
 * and the task handed to a runner are fed from that one result.
 */

import { Github } from '@/context/github';
import type { ActionRun, ActionRunAttempt, ActionRunJob } from '@/models';
import type Workflow from '@/workflow';

/** The rows a github context can be resolved from; every one of them is optional. */
export interface GithubContextSources {
  run?: Pick<ActionRun, 'id' | 'index' | 'ref' | 'commitSha' | 'eventName' | 'eventPayload'> | null;
  workflow?: Pick<Workflow, 'name' | 'file'> | null;
  attempt?: Pick<ActionRunAttempt, 'attempt'> | null;
  job?: Pick<ActionRunJob, 'jobId' | 'repositoryId' | 'attempt'> | null;
}

/**
 * Resolve the github context for a run, and for one of its jobs when there is one.
 *
 * The derivation itself lives on {@link Github}, which the runner uses too; this
 * only feeds it the columns and replays its setters in the order they expect. Two
 * keys are deliberately left out:
 *
 * - `token` is only added when the task is handed to a runner.
 * - `repository`/`repository_owner` would need a repository table and an owner
 *   table, neither of which this codebase has; every job is seeded against one
 *   synthetic repository.
 */
export function generateGithubContext(sources: GithubContextSources): Record<string, unknown> {
  const { run, workflow, attempt, job } = sources;

  const github = new Github({
    event_name: run?.eventName ?? 'workflow_dispatch',
    event: parseEventPayload(run?.eventPayload),
    ref: run?.ref ?? '',
    sha: run?.commitSha ?? '',
    run_id: String(run?.id ?? ''),
    run_number: String(run?.index ?? ''),
    repository_id: String(job?.repositoryId ?? ''),
    workflow: workflow?.name || workflow?.file || '',
    server_url: 'https://github.com',
    secret_source: 'Actions',
    actor: 'actions',
    triggering_actor: 'actions',
  });

  // Order matters: `setRef` swaps in the base ref for `pull_request_target`, so the
  // base and head refs have to be resolved before it runs, and the ref-derived name
  // and type only make sense once the ref itself is final.
  github.setBaseAndHeadRef();
  github.setRef(run?.ref ?? '');
  github.setRefTypeAndName();
  github.setSha(run?.commitSha ?? '');

  return {
    ...github,
    job: job?.jobId ?? '',
    run_attempt: String(attempt?.attempt ?? job?.attempt ?? 1),
  };
}

/** The payload is JSON an earlier submit stored; one that cannot be read reads as empty. */
function parseEventPayload(payload: string | undefined): Record<string, unknown> {
  if (!payload) {
    return {};
  }

  try {
    return JSON.parse(payload);
  } catch {
    return {};
  }
}
