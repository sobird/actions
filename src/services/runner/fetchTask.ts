import { ConnectError, Code } from '@connectrpc/connect';

import { ActionTaskVersion, ActionRunner } from '@/models';
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

  let latestVersion: bigint;

  try {
    latestVersion = await ActionTaskVersion.findOneVersionByScope(ownerId, repositoryId);
  } catch (error) {
    throw new ConnectError('query tasks version failed: ' + error, Code.Internal);
  }

  if (latestVersion === 0n) {
    try {
      await ActionTaskVersion.increaseVersion(ownerId, repositoryId);
    } catch (error) {
      throw new ConnectError('fail to increase task version: ' + error, Code.Internal);
    }
    latestVersion += 1n;
  }

  if (taskVersion !== latestVersion) {
    // if the task version in request is not equal to the version in db,
    // it means there may still be some tasks not be assgined.
    // try to pick a task for the runner that send the request.

    await ActionRunner.findOne({
      where: {
        uuid: runner.uuid,
      },
    });
  }

  return {
    tasksVersion: latestVersion,
  };
};
