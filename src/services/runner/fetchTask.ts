import { ConnectError } from '@connectrpc/connect';

import models from '@/models';
// import { runnerModelContextKey } from '@/services/runner';

import type { ServiceMethodImpl } from '.';
import { RunnerModelFrom } from './interceptors/with_runner';

// export const runnerModelContextKey = createContextKey< undefined>(undefined, {
//   description: 'current runner model',
// });

export const fetchTask: ServiceMethodImpl['fetchTask'] = async (req, { values }) => {
  const runner = RunnerModelFrom(values)!;
  const { ownerId = 0, repositoryId = 0 } = runner;

  const taskVersion = req.tasksVersion;
  let latestVersion = await models.Actions.TaskVersion.findOneVersionByScope(ownerId, repositoryId);

  if (latestVersion === undefined) {
    throw new ConnectError('query tasks version failed', 13);
  }

  if (latestVersion === 0n) {
    await models.Actions.TaskVersion.increaseVersion(ownerId, repositoryId);

    latestVersion += 1n;
  }

  console.log('latestVersion', taskVersion, latestVersion);

  // if (taskVersion !== BigInt(latestVersion)) {
  //   // if the task version in request is not equal to the version in db,
  //   // it means there may still be some tasks not be assgined.
  //   // try to pick a task for the runner that send the request.

  // }

  return {
    tasksVersion: latestVersion,
  };
};
