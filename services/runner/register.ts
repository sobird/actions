import { ConnectError } from '@connectrpc/connect';

import { ActionsRunnerModel, ActionsRunnerTokenModel } from '@/models';
import { RegisterResponse, Runner } from '@/pkg/service/runner/v1/messages_pb';
import { tryCatch } from '@/utils/test';

import type { ServiceMethodImpl } from '.';

// Register register a new runner in server.
export const register: ServiceMethodImpl<'register'> = async (req) => {
  if (req.token === '' || req.name === '') {
    throw new ConnectError('missing runner token, name', 3);
  }

  const actionsRunnerToken = await ActionsRunnerTokenModel.findOne({
    where: {
      token: req.token,
    },
  });

  if (!actionsRunnerToken) {
    throw new ConnectError('runner registration token not found', 5);
  }

  if (!actionsRunnerToken.enabled) {
    throw new ConnectError('runner registration token has been invalidated, please use the latest one', 4);
  }

  // create new runner

  await tryCatch(async () => {

  });

  const { name } = req;

  const actionsRunner = await ActionsRunnerModel.create({
    name: req.name,
    ownerId: actionsRunnerToken.ownerId,
    repositoryId: actionsRunnerToken.repositoryId,
    version: req.version,
    labels: req.labels,

    token: 'token',
    tokenHash: 'tokenHash',
    tokenSalt: 'tokenSalt',
  });

  return new RegisterResponse({
    runner: new Runner({
      id: actionsRunner.id,
      uuid: actionsRunner.uuid,
      token: actionsRunner.token,
      name,
      version: actionsRunner.version,
      labels: actionsRunner.labels,
    }),
  });
};
