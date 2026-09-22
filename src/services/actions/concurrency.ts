import type { ActionRunAttempt, ActionRunJob } from '@/models';

/**
 * A `concurrency` node, resolved as far as this server can take it.
 */
export interface RawConcurrency {
  group: string;
  cancel: boolean;
}

/**
 * Resolve a raw `concurrency` node into its group and its cancel flag.
 *
 * Mirrors the two shapes act's `RawConcurrency` accepts: a bare scalar, which names a
 * group and leaves cancelling off, and a mapping carrying `group` and
 * `cancel-in-progress`. Values are taken as written — the server owns no expression
 * engine, so a `${{ }}` stays part of the group name instead of being interpolated, the
 * way `continue-on-error` is only honored as a literal boolean.
 *
 * Returns null for a node of neither shape, which upstream reports as a syntax error.
 */
export function parseRawConcurrency(raw: unknown): RawConcurrency | null {
  if (typeof raw === 'string') {
    return { group: raw, cancel: false };
  }
  if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
    const { group, 'cancel-in-progress': cancelInProgress } = raw as Record<string, unknown>;
    return { group: typeof group === 'string' ? group : '', cancel: cancelInProgress === true };
  }

  return null;
}

/**
 * Resolve a job's raw concurrency into the columns the job carries.
 *
 * Port of gitea's `services/actions/concurrency.go` `EvaluateJobConcurrencyFillModel`, with
 * its expression evaluation taken out: upstream may leave `IsConcurrencyEvaluated` false
 * when the group reads another job's outputs, while this port never reads them, so a node
 * that parses at all is resolved as soon as the job is ready to start.
 *
 * Returns false when the node the job carries cannot be read, which leaves the job blocked
 * — how upstream treats an evaluation error it cannot attribute to a missing dependency.
 */
export function evaluateJobConcurrencyFillModel(job: ActionRunJob): boolean {
  const parsed = parseRawConcurrency(JSON.parse(job.rawConcurrency));
  if (!parsed) {
    return false;
  }

  job.concurrencyGroup = parsed.group;
  job.concurrencyCancel = parsed.cancel;
  job.isConcurrencyEvaluated = true;
  return true;
}

/**
 * Resolve a workflow's raw concurrency into the columns the run attempt carries.
 *
 * Port of gitea's `services/actions/concurrency.go` `EvaluateRunConcurrencyFillModel`. The
 * workflow level has no `needs` to wait on, so unlike the job level it is always resolvable,
 * and the attempt has no `isConcurrencyEvaluated` column to mark it with.
 *
 * Returns false when the node cannot be read. Upstream fails the whole run insert on that,
 * so a caller creating a run is expected to reject rather than carry on ungrouped.
 */
export function evaluateRunConcurrencyFillModel(attempt: ActionRunAttempt, rawConcurrency: string): boolean {
  const parsed = parseRawConcurrency(JSON.parse(rawConcurrency));
  if (!parsed) {
    return false;
  }

  attempt.concurrencyGroup = parsed.group;
  attempt.concurrencyCancel = parsed.cancel;
  return true;
}
