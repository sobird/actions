import { ConnectError } from '@connectrpc/connect';

import { DeclareResponse, Runner } from '@/pkg/service/runner/v1/messages_pb';

import type { ServiceMethodImpl } from '.';
import { RunnerModelFrom } from './interceptors/with_runner';

export const declare: ServiceMethodImpl<'declare'> = async (req, { values }) => {
  const runner = RunnerModelFrom(values)!;
  runner.labels = req.labels;
  runner.version = req.version;

  try {
    await runner.save();
  } catch (error) {
    throw new ConnectError(`update runner: ${(error as Error).message}`, 13);
  }

  return new DeclareResponse({
    runner: new Runner({
      id: runner.id,
      uuid: runner.uuid,
      token: runner.token,
      name: runner.name,
      version: runner.version,
      labels: runner.labels,
    }),
  });
};
