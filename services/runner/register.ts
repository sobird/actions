import { create } from '@bufbuild/protobuf';
import { ConnectError } from '@connectrpc/connect';

import models from '@/models';
import { RegisterResponseSchema, RunnerSchema } from '@/pkg/service/runner/v1/messages_pb';
import lodash from '@/utils/lodash';

import type { ServiceMethodImpl } from '.';

// Register register a new runner in server.
export const register: ServiceMethodImpl['register'] = async (req) => {
  if (req.token === '' || req.name === '') {
    throw new ConnectError('missing runner token, name', 3);
  }

  const runnerToken = await models.Actions.RunnerToken.findOne({
    where: {
      token: req.token,
    },
  });

  console.log('runnerToken', runnerToken);

  if (!runnerToken) {
    throw new ConnectError('runner registration token not found', 5);
  }

  if (!runnerToken.enabled) {
    throw new ConnectError('runner registration token has been invalidated, please use the latest one', 4);
  }

  if (runnerToken.ownerId > 0) {
    //
  }

  if (runnerToken.repositoryId > 0) {
    //
  }

  // create new runner
  const name = lodash.truncate(req.name, { length: 255 });
  const runner = await models.Actions.Runner.create({
    name,
    ownerId: runnerToken.ownerId,
    repositoryId: runnerToken.repositoryId,
    version: req.version,
    labels: req.labels,
  });

  return {
    runner: {
      id: runner.id,
      uuid: runner.uuid,
      token: runner.token,
      name: runner.name,
      version: runner.version,
      labels: runner.labels,
    },
  };
};
