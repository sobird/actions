import { createContextKey, type ServiceImpl } from '@connectrpc/connect';

import models from '@/models';
import { RunnerService } from '@/pkg/service/runner/v1/services_pb';

import { declare } from './declare';
import { fetchTask } from './fetchTask';
import { register } from './register';

export { RunnerService };
export { default as RunnerServiceInterceptors } from './interceptors';

export type ServiceMethodImpl = ServiceImpl<typeof RunnerService>;

export const runnerModelContextKey = createContextKey<typeof models.Actions.Runner | undefined>(undefined, {
  description: 'current runner model',
});

// console.log('fetchTask', fetchTask2);

export const RunnerServiceImpl = {
  register,
  declare,
  fetchTask,
};
