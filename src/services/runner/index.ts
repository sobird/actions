import type { ServiceImpl } from '@connectrpc/connect';

import { RunnerService } from '@/gen/runner/v1/services_pb';

import { declare } from './declare';
import { fetchTask } from './fetchTask';
import { register } from './register';
import { updateLog } from './updateLog';
import { updateTask } from './updateTask';

export { RunnerService };
export { default as RunnerServiceInterceptors } from './interceptors';
export { getRunnerModel } from './context';

export const RunnerServiceImpl = {
  register,
  declare,
  fetchTask,
  updateTask,
  updateLog,
} satisfies ServiceImpl<typeof RunnerService>;
