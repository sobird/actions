import { ConnectError, Code, type MethodImpl } from '@connectrpc/connect';

import type { RunnerService } from '@/gen/runner/v1/services_pb';

import { getRunnerModel } from './context';

export const declare: MethodImpl<typeof RunnerService.method.declare> = async (req, { values }) => {
  const runner = getRunnerModel(values)!;
  runner.labels = req.labels;
  runner.version = req.version;

  try {
    await runner.save();
  } catch (error) {
    throw new ConnectError(`update runner: ${(error as Error).message}`, Code.Internal);
  }

  return {
    runner: {
      id: runner.id,
      uuid: runner.uuid,
      token: runner.token,
      name: runner.name,
      version: runner.version,
      labels: runner.labels,
    },
  };
};
