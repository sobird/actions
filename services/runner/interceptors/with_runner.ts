import {
  Interceptor, ConnectError, createContextKey, HandlerContext,
} from '@connectrpc/connect';

import { ActionsRunner } from '@/models/actions';
import Constants from '@/pkg/common/constants';

const runnerModelContextKey = createContextKey<ActionsRunner | null>(null, {
  description: 'current runner model',
});

const { XRunnerUUID, XRunnerToken } = Constants.Protocol;
const withRunner: Interceptor = (next) => {
  return async (req) => {
    const methodName = req.method.name;
    if (methodName === 'Register') {
      return next(req);
    }
    const uuid = req.header.get(XRunnerUUID)!;
    const token = req.header.get(XRunnerToken)!;
    console.log('token', token);

    const runner = await ActionsRunner.findOne({ where: { uuid } });

    if (!runner) {
      throw new ConnectError('unregistered runner', 16);
    }

    // auth token

    runner.lastOnline = new Date();
    if (methodName === 'UpdateTask' || methodName === 'UpdateLog') {
      runner.lastActive = new Date();
    }

    req.contextValues.set(runnerModelContextKey, runner);
    await runner.save();

    return next(req);
  };
};

export function RunnerModelFrom(values: HandlerContext['values']) {
  return values.get(runnerModelContextKey);
}

export default withRunner;
