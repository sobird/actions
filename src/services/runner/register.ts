import { ConnectError } from '@connectrpc/connect';

import { ActionRunnerToken, ActionRunner } from '@/models';
import lodash from '@/utils/lodash';

import type { ServiceMethodImpl } from '.';

const RUNNER_CAPABILITY_CANCELLING = 'cancelling';

// Register register a new runner in server.
export const register: ServiceMethodImpl['register'] = async (req) => {
  if (req.token === '' || req.name === '') {
    throw new ConnectError('missing runner token, name', 3);
  }

  const runnerToken = await ActionRunnerToken.findOne({
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

  const hasCancellingSupport: boolean = req.capabilities.includes(RUNNER_CAPABILITY_CANCELLING);

  // create new runner
  const name = lodash.truncate(req.name, { length: 255 });
  const runner = await ActionRunner.create({
    name,
    ownerId: runnerToken.ownerId,
    repositoryId: runnerToken.repositoryId,
    version: req.version,
    labels: req.labels,
    ephemeral: req.ephemeral,
    hasCancellingSupport,
  });

  return {
    runner: {
      id: runner.id,
      uuid: runner.uuid,
      token: runner.token,
      name: runner.name,
      version: runner.version,
      labels: runner.labels,
      ephemeral: runner.ephemeral,
    },
  };
};
