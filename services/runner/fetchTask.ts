import { ConnectError } from '@connectrpc/connect';

import { ActionsRunnerModel } from '@/models';
import Constants from '@/pkg/common/constants';
import { FetchTaskResponse } from '@/pkg/service/runner/v1/messages_pb';

import type { ServiceMethodImpl } from '.';

const { XRunnerUUID, XRunnerToken, XRunnerVersion } = Constants.Protocol;

export const fetchTask: ServiceMethodImpl<'fetchTask'> = async (req, { requestHeader }) => {
  console.log('requestHeader', requestHeader);
  const runnerUUID = requestHeader.get(XRunnerUUID);
  console.log('runnerUUID', runnerUUID);

  // todo task version

  return new FetchTaskResponse({

  });
};
