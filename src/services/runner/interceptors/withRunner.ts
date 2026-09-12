import { Interceptor, ConnectError, Code } from '@connectrpc/connect';

import { Constants } from '@/common/constants';
import { RunnerService } from '@/gen/runner/v1/services_pb';
import { ActionRunner } from '@/models/actions';

import { setRunnerModel } from '../context';

const { XRunnerUUID, XRunnerToken } = Constants.Protocol;

export const withRunner: Interceptor = (next) => {
  return async (req) => {
    // Register is the only unauthenticated RPC: it is how a runner obtains its token.
    if (req.method === RunnerService.method.register) {
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
    if (req.method === RunnerService.method.updateTask || req.method === RunnerService.method.updateLog) {
      runner.lastActive = new Date();
    }

    await runner.save();

    setRunnerModel(req.contextValues, runner);

    return next(req);
  };
};
