import { Interceptor, ConnectError } from '@connectrpc/connect';

import { ActionsRunnerModel } from '@/models';
import Constants from '@/pkg/common/constants';
import { runnerModelContextKey } from '@/services/runner';

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

    const runner = await ActionsRunnerModel.findOne({ where: { uuid } });

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

export default withRunner;
