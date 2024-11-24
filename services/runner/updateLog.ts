import { ConnectError } from '@connectrpc/connect';

import { ActionsTaskModel } from '@/models';
import Constants from '@/pkg/common/constants';
import Log from '@/pkg/log';
import { UpdateLogResponse } from '@/pkg/service/runner/v1/messages_pb';

import type { ServiceMethodImpl } from '.';

const { XRunnerUUID } = Constants.Protocol;

export const updateLog: ServiceMethodImpl<'updateLog'> = async (req, { requestHeader }) => {
  const runnerUUID = requestHeader.get(XRunnerUUID);
  console.log('runnerUUID', runnerUUID);

  const response = new UpdateLogResponse();

  const task = await ActionsTaskModel.findByPk(req.taskId);

  const ack = task?.logLength || 0;

  if (req.rows.length === 0 || req.index > ack || (BigInt(req.rows.length) + req.index) <= ack) {
    response.ackIndex = BigInt(ack);
    return response;
  }

  if (task?.logInStorage) {
    // AlreadyExists
    throw new ConnectError('log file has been archived', 6);
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
