import Constants from '@/pkg/common/constants';
import { UpdateTaskResponse } from '@/pkg/service/runner/v1/messages_pb';

import type { ServiceMethodImpl } from '.';

const { XRunnerUUID } = Constants.Protocol;

export const updateTask: ServiceMethodImpl<'updateTask'> = async (req, { requestHeader }) => {
  console.log('requestHeader', requestHeader);
  const runnerUUID = requestHeader.get(XRunnerUUID);
  console.log('runnerUUID', runnerUUID);

  return new UpdateTaskResponse({

  });
};
