import { create } from '@bufbuild/protobuf';
import { ConnectError, Code, type MethodImpl } from '@connectrpc/connect';

import { UpdateLogResponseSchema } from '@/gen/runner/v1/messages_pb';
import type { RunnerService } from '@/gen/runner/v1/services_pb';
import Log from '@/log';
import { models } from '@/models';

import { getRunnerModel } from './context';

export const updateLog: MethodImpl<typeof RunnerService.method.updateLog> = async (req, { values }) => {
  const runner = getRunnerModel(values)!;

  const task = await models.ActionTask.findByPk(req.taskId);
  if (!task) {
    throw new ConnectError(`get task: task with id ${req.taskId}: not exist`, Code.Internal);
  }
  if (runner.id !== task.runnerId) {
    throw new ConnectError('invalid runner for task', Code.Internal);
  }

  const response = create(UpdateLogResponseSchema);

  const ack = task.logLength;

  // Trim rows the runner already had acked.
  const rows =
    req.index <= ack && BigInt(req.rows.length) + req.index > ack ? req.rows.slice(ack - Number(req.index)) : [];

  // Ack a re-sent finalize idempotently. Appending new rows past the seal errors.
  if (task.logInStorage) {
    if (rows.length > 0) {
      throw new ConnectError('log file has been archived', Code.AlreadyExists);
    }
    response.ackIndex = BigInt(ack);
    return response;
  }

  // Bail unless we have new rows or a NoMore to finalize. Even with NoMore, bail
  // when the runner has outrun the server — archiving a log with a gap is worse
  // than asking it to retry.
  if (rows.length === 0 && (!req.noMore || req.index > ack)) {
    response.ackIndex = BigInt(ack);
    return response;
  }

  // Write even with no rows: with offset 0 it bootstraps an empty DBFS file so
  // the transfer below has something to read when a task produced no output.
  const ns = await Log.write(task.logFilename, task.logSize || 0, rows);

  task.logLength += rows.length;
  ns.forEach((bytesWritten) => {
    task.logSize += bytesWritten;
  });

  response.ackIndex = BigInt(task.logLength);

  let remove: (() => Promise<void>) | undefined;
  if (req.noMore) {
    task.logInStorage = true;
    remove = await Log.transfer(task.logFilename);
  }

  await task.save();

  // Drop the DBFS copy only after the row marking the log as archived is durable.
  await remove?.();

  return response;
};
