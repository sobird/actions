import { ConnectError, createContextKey } from '@connectrpc/connect';

import { ActionsRunnerModel } from '@/models';
import Constants from '@/pkg/common/constants';
import { FetchTaskResponse } from '@/pkg/service/runner/v1/messages_pb';

import type { ServiceMethodImpl } from '.';

const { XRunnerUUID, XRunnerToken, XRunnerVersion } = Constants.Protocol;

export const fetchTask: ServiceMethodImpl<'fetchTask'> = async (req, res) => {
  // todo task version

  console.log('req', res);

  return new FetchTaskResponse({

  });
};
