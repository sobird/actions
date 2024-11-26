import { ConnectError } from '@connectrpc/connect';

import { ActionsTaskVersionModel } from '@/models';
import { FetchTaskResponse } from '@/pkg/service/runner/v1/messages_pb';
// import { runnerModelContextKey } from '@/services/runner';

import type { ServiceMethodImpl } from '.';
import { RunnerModelFrom } from './interceptors/with_runner';

// export const runnerModelContextKey = createContextKey< undefined>(undefined, {
//   description: 'current runner model',
// });

export const fetchTask: ServiceMethodImpl<'fetchTask'> = async (req, { values }) => {
  const runner = RunnerModelFrom(values)!;
  const { ownerId = 0, repositoryId = 0 } = runner;

  const taskVersion = req.tasksVersion;
  let latestVersion = await ActionsTaskVersionModel.findOneVersionByScope(ownerId, repositoryId);

  if (latestVersion === undefined) {
    throw new ConnectError('query tasks version failed', 13);
  }

  if (latestVersion === 0n) {
    await ActionsTaskVersionModel.increaseVersion(ownerId, repositoryId);

    latestVersion += 1n;
  }

  console.log('latestVersion', taskVersion, latestVersion);

  // if (taskVersion !== BigInt(latestVersion)) {
  //   // if the task version in request is not equal to the version in db,
  //   // it means there may still be some tasks not be assgined.
  //   // try to pick a task for the runner that send the request.

  // }

  return new FetchTaskResponse({
    tasksVersion: latestVersion,
  });
};
