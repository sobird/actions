import { create } from '@bufbuild/protobuf';
import { ConnectError, Code, type MethodImpl } from '@connectrpc/connect';

import { FetchTaskResponseSchema } from '@/gen/runner/v1/messages_pb';
import type { RunnerService } from '@/gen/runner/v1/services_pb';
import { ActionTaskVersion } from '@/models';
import { pickTask } from '@/services/actions/task';

import { getRunnerModel } from './context';

export const fetchTask: MethodImpl<typeof RunnerService.method.fetchTask> = async (req, { values }) => {
  const runner = getRunnerModel(values)!;
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

    const picked = await pickTask(runner);

    return create(FetchTaskResponseSchema, {
      tasksVersion: latestVersion,
      task: picked?.task,
    });
  }

  return create(FetchTaskResponseSchema, {
    tasksVersion: latestVersion,
  });
};
