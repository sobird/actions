import { create } from '@bufbuild/protobuf';
import { ConnectError, Code, type MethodImpl } from '@connectrpc/connect';

import { UpdateLogResponseSchema } from '@/gen/runner/v1/messages_pb';
import type { RunnerService } from '@/gen/runner/v1/services_pb';
import Log from '@/log';
import { models } from '@/models';

export const updateLog: MethodImpl<typeof RunnerService.method.updateLog> = async (req) => {
  const response = create(UpdateLogResponseSchema);

  const task = await models.ActionTask.findByPk(req.taskId);

  const ack = task?.logLength || 0;

  if (req.rows.length === 0 || req.index > ack || BigInt(req.rows.length) + req.index <= ack) {
    response.ackIndex = BigInt(ack);
    return response;
  }

  if (task?.logInStorage) {
    // AlreadyExists
    throw new ConnectError('log file has been archived', Code.AlreadyExists);
  }

  const rows = req.rows.slice(ack - Number(req.index));
  const ns = await Log.write('test.log', task?.logSize || 0, rows);

  task!.logLength += rows.length;
  ns.forEach((item) => {
    // task!.logIndexes =
    task!.logSize += item.bytesWritten;
  });

  response.ackIndex = BigInt(task!.logLength);

  if (req.noMore) {
    task!.logInStorage = true;
  }

  await task?.save();

  return response;
};
