import { create } from '@bufbuild/protobuf';
import { ConnectError, Code, type MethodImpl } from '@connectrpc/connect';

import logger from '@/common/logger';
import { Result, TaskStateSchema, UpdateTaskResponseSchema } from '@/gen/runner/v1/messages_pb';
import type { RunnerService } from '@/gen/runner/v1/services_pb';
import { sequelize } from '@/lib/sequelize';
import { ActionRunJob, ActionTask, ActionTaskOutput, ActionTaskVersion } from '@/models';
import { Status } from '@/models/actions/status';
import { resolveBlockedJobs } from '@/services/actions/job_emitter';

import { getRunnerModel } from './context';

const MaxOutputKeyLength = 255;
const MaxOutputValueSize = 1024 * 1024;

export const updateTask: MethodImpl<typeof RunnerService.method.updateTask> = async (req, { values }) => {
  const runner = getRunnerModel(values)!;

  // Upstream tolerates a nil state: it has no id, so it falls through to the not-found path.
  const state = req.state ?? create(TaskStateSchema);

  let updatedTask: ActionTask;
  try {
    updatedTask = await sequelize.transaction(async (transaction) => {
      const task = await ActionTask.updateByState(runner.id, state, transaction);

      if (state.result !== Result.UNSPECIFIED) {
        // Finishing a job decides the jobs waiting on it.
        const job = await ActionRunJob.findByPk(task.jobId, { transaction });
        if (job) {
          await resolveBlockedJobs(job.runId, transaction);
        }

        // Finishing a job may have unblocked waiting jobs; bump the versions so idle
        // runners whose tasksVersion already equals latestVersion attempt a PickTask.
        const waiting = await ActionRunJob.findOne({
          where: { repositoryId: task.repositoryId, taskId: 0, status: Status.Waiting.toString() },
          transaction,
        });
        if (waiting) {
          await ActionTaskVersion.increaseVersion(task.ownerId, task.repositoryId, transaction);
        }
      }

      return task;
    });
  } catch (error) {
    // gitea's UpdateTask handler folds every failure of the state update into one error
    throw new ConnectError(`update task: ${(error as Error).message}`, Code.Internal);
  }

  for (const [key, value] of Object.entries(req.outputs)) {
    if (key.length > MaxOutputKeyLength) {
      logger.warn(`Ignore the output of task ${updatedTask.id} because the key is too long: ${key}`);
      continue;
    }
    if (value.length > MaxOutputValueSize) {
      logger.warn(`Ignore the output ${key} of task ${updatedTask.id} because the value is too long: ${value.length}`);
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    await ActionTaskOutput.insertIfNotExist(updatedTask.id, key, value);
  }

  const sentOutputs = await ActionTaskOutput.findKeysByTaskId(updatedTask.id);

  // TODO(upstream routers/api/actions/runner/runner.go UpdateTask): the commit status
  // (CreateCommitStatusForRunJobs) and the job/run notifications (NotifyWorkflowJobStatusUpdateWithTask,
  // NotifyWorkflowRunStatusUpdateWithReload) are not ported yet; this repo has no repo/user
  // models or notify service to hang them on. The job emitter runs inline above instead of
  // through upstream's queue, so nothing here waits for a re-emit.

  return create(UpdateTaskResponseSchema, {
    state: create(TaskStateSchema, { id: state.id, result: updatedTask.status.asResult() }),
    sentOutputs,
  });
};
