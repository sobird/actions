import { createContextKey, type HandlerContext } from '@connectrpc/connect';

import { ActionRunner } from '@/models/actions';

// The key stays private so the runner can only be read/written through the
// helpers below; the interceptor writes it, the handlers read it.
const runnerModelContextKey = createContextKey<ActionRunner | null>(null, {
  description: 'current runner model',
});

export function setRunnerModel(values: HandlerContext['values'], runner: ActionRunner) {
  values.set(runnerModelContextKey, runner);
}

export function RunnerModelFrom(values: HandlerContext['values']) {
  return values.get(runnerModelContextKey);
}
