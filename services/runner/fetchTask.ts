import { ConnectError } from '@connectrpc/connect';

import { ActionsTaskVersionModel } from '@/models';
import { FetchTaskResponse } from '@/pkg/service/runner/v1/messages_pb';
import { runnerModelContextKey } from '@/services/runner';

import type { ServiceMethodImpl } from '.';

export const fetchTask: ServiceMethodImpl<'fetchTask'> = async (req, { values }) => {
  const runner = values.get(runnerModelContextKey)!;
  const { ownerId = 0, repositoryId = 0 } = runner;

  const taskVersion = req.tasksVersion;
  let latestVersion = await ActionsTaskVersionModel.findOneVersionByScope(ownerId, repositoryId);

  console.log('latestVersion', latestVersion);

  if (latestVersion === 0) {
    await ActionsTaskVersionModel.increaseVersion(ownerId, repositoryId);

    latestVersion += 1;
  }

  console.log('latestVersion', taskVersion, latestVersion);

  if (taskVersion !== BigInt(latestVersion)) {
    // if the task version in request is not equal to the version in db,
    // it means there may still be some tasks not be assgined.
    // try to pick a task for the runner that send the request.

  }

  return new FetchTaskResponse({

  });
};
