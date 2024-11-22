import { ConnectError } from '@connectrpc/connect';

import { ActionsRunnerModel } from '@/models';
import Constants from '@/pkg/common/constants';
import { DeclareResponse } from '@/pkg/service/runner/v1/messages_pb';

import type { ServiceMethodImpl } from '.';

const { XRunnerUUID, XRunnerToken, XRunnerVersion } = Constants.Protocol;

export const declare: ServiceMethodImpl<'declare'> = async (req, { requestHeader }) => {
  console.log('requestHeader', requestHeader);
  const runnerUUID = requestHeader.get(XRunnerUUID);
  console.log('runnerUUID', runnerUUID);

  const result = await ActionsRunnerModel.update({
    labels: req.labels,
    version: req.version,
  }, {
    where: {
      uuid: 'dd5e1e50-33d4-4e5d-91b8-ddc2a1a022e5'!,
    },
    returning: true,
  });

  console.log('result', result);

  return new DeclareResponse({

  });
};
