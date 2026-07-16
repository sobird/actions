import { Interceptor, ConnectError, createContextKey, HandlerContext, Code } from '@connectrpc/connect';

import Constants from '@/common/constants';
import { ActionRunner } from '@/models/actions';

const runnerModelContextKey = createContextKey<ActionRunner | null>(null, {
  description: 'current runner model',
});

const { XRunnerUUID, XRunnerToken } = Constants.Protocol;
export const withRunner: Interceptor = (next) => {
  return async (req) => {
    const methodName = req.method.name;
    if (methodName === 'Register') {
      return next(req);
    }

    const uuid = req.header.get(XRunnerUUID)!;
    const token = req.header.get(XRunnerToken)!;

    const runner = await ActionRunner.findOne({ where: { uuid } });

    if (!runner) {
      throw new ConnectError('unregistered runner', Code.Unauthenticated);
    }

    if (!runner.verifyToken(token)) {
      throw new ConnectError('unregistered runner', Code.Unauthenticated);
    }

    runner.lastOnline = new Date();
    if (methodName === 'UpdateTask' || methodName === 'UpdateLog') {
      runner.lastActive = new Date();
    }

    await runner.save();

    req.contextValues.set(runnerModelContextKey, runner);

    return next(req);
  };
};

export function RunnerModelFrom(values: HandlerContext['values']) {
  return values.get(runnerModelContextKey);
}
