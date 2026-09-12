import { create } from '@bufbuild/protobuf';
import { timestampDate, type Timestamp } from '@bufbuild/protobuf/wkt';
import { ConnectError, Code, type MethodImpl } from '@connectrpc/connect';

import logger from '@/common/logger';
import { Result, TaskStateSchema, UpdateTaskResponseSchema } from '@/gen/runner/v1/messages_pb';
import type { RunnerService } from '@/gen/runner/v1/services_pb';
import { sequelize } from '@/lib/sequelize';
import { ActionRunJob, ActionRunner, ActionTask, ActionTaskOutput, ActionTaskStep, ActionTaskVersion } from '@/models';
import { Status } from '@/models/actions/status';

import { getRunnerModel } from './context';

const MaxOutputKeyLength = 255;
const MaxOutputValueSize = 1024 * 1024;

/** A zero or absent timestamp means "unset", mirroring upstream convertTimestamp */
function convertTimestamp(timestamp?: Timestamp) {
  if (!timestamp || (timestamp.seconds === 0n && timestamp.nanos === 0)) {
    return undefined;
  }
  return timestampDate(timestamp);
}

export const updateTask: MethodImpl<typeof RunnerService.method.updateTask> = async (req, { values }) => {
  const runner = getRunnerModel(values)!;

  // Upstream tolerates a nil state: it has no id, so it falls through to the not-found path.
  const state = req.state ?? create(TaskStateSchema);

  const updatedTask = await sequelize.transaction(async (transaction) => {
    const task = await ActionTask.findByPk(state.id, { transaction });
    if (!task) {
      throw new ConnectError(`update task: task with id ${state.id}: not exist`, Code.Internal);
    }
    if (runner.id !== task.runnerId) {
      throw new ConnectError('invalid runner for task', Code.Internal);
    }

    if (task.status.isDone()) {
      // the state is final, do nothing
      return task;
    }

    // state.result is not unspecified means the task is finished
    if (state.result !== Result.UNSPECIFIED) {
      // The runner may report SUCCESS/FAILURE for the cleanup phase; preserve user intent.
      const status = task.status === Status.Cancelling ? Status.Cancelled : Status.fromResult(state.result);
      const stopped = convertTimestamp(state.stoppedAt) ?? null;

      task.status = status;
      task.stopped = stopped;
      await task.save({ transaction });

      // A finished task releases its ephemeral runner.
      if (status.isDone()) {
        await ActionRunner.deleteEphemeralRunner(task.runnerId, transaction);
      }

      await ActionRunJob.update({ status, stopped }, { where: { id: task.jobId }, transaction });

      // Finishing a job may have unblocked waiting jobs; bump the versions so idle
      // runners whose tasksVersion already equals latestVersion attempt a PickTask.
      const waiting = await ActionRunJob.findOne({
        where: { repositoryId: task.repositoryId, taskId: 0, status: Status.Waiting.toString() },
        transaction,
      });
      if (waiting) {
        await ActionTaskVersion.increaseVersion(task.ownerId, task.repositoryId);
      }
    } else {
      // Touch the updated timestamp so the task isn't judged as a zombie task.
      await ActionTask.update({}, { where: { id: task.id }, transaction });
    }

    const stepStates = new Map(state.steps.map((stepState) => [Number(stepState.id), stepState]));
    const steps = await ActionTaskStep.findAll({ where: { taskId: Number(task.id) }, transaction });

    for (const step of steps) {
      const stepState = stepStates.get(step.index);
      const started = stepState ? convertTimestamp(stepState.startedAt) : undefined;

      if (stepState) {
        step.logIndex = Number(stepState.logIndex);
        step.logLength = Number(stepState.logLength);
        step.startedAt = started ?? null;
        step.stoppedAt = convertTimestamp(stepState.stoppedAt) ?? null;

        if (stepState.result !== Result.UNSPECIFIED) {
          step.status = Status.fromResult(stepState.result).toString();
        } else if (started) {
          step.status = Status.Running.toString();
        }
      }
      // eslint-disable-next-line no-await-in-loop
      await step.save({ transaction });
    }

    return task;
  });

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
    await ActionTaskOutput.insertIfNotExist(Number(updatedTask.id), key, value);
  }

  const sentOutputs = await ActionTaskOutput.findKeysByTaskId(Number(updatedTask.id));

  // TODO(upstream routers/api/actions/runner/runner.go UpdateTask): the commit status
  // (CreateCommitStatusForRunJobs), the job/run notifications (NotifyWorkflowJobStatusUpdateWithTask,
  // NotifyWorkflowRunStatusUpdateWithReload) and the job emitter (EmitJobsIfReadyByRun) are not
  // ported yet; this repo has no repo/user models, notify service or job queue to hang them on.

  return create(UpdateTaskResponseSchema, {
    state: create(TaskStateSchema, { id: state.id, result: updatedTask.status.asResult() }),
    sentOutputs,
  });
};
