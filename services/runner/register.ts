import { ConnectError } from '@connectrpc/connect';

import { ActionsRunnerModel, ActionsRunnerTokenModel } from '@/models';
import { RegisterResponse, Runner } from '@/pkg/service/runner/v1/messages_pb';
import lodash from '@/utils/lodash';
import { tryCatch } from '@/utils/test';

import type { ServiceMethodImpl } from '.';

// Register register a new runner in server.
export const register: ServiceMethodImpl<'register'> = async (req) => {
  if (req.token === '' || req.name === '') {
    throw new ConnectError('missing runner token, name', 3);
  }

  const runnerToken = await ActionsRunnerTokenModel.findOne({
    where: {
      token: req.token,
    },
  });

  if (!runnerToken) {
    throw new ConnectError('runner registration token not found', 5);
  }

  if (!runnerToken.enabled) {
    throw new ConnectError('runner registration token has been invalidated, please use the latest one', 4);
  }

  // create new runner
  const name = lodash.truncate(req.name, { length: 255 });

  await tryCatch(async () => {

  });

  const runner = await ActionsRunnerModel.create({
    name,
    ownerId: runnerToken.ownerId,
    repositoryId: runnerToken.repositoryId,
    version: req.version,
    labels: req.labels,

    // token: 'token',
    // tokenHash: 'tokenHash',
    // tokenSalt: 'tokenSalt',
  });

  return new RegisterResponse({
    runner: new Runner({
      id: runner.id,
      uuid: runner.uuid,
      token: runner.token,
      name,
      version: runner.version,
      labels: runner.labels,
    }),
  });
};
