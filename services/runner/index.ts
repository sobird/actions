import { type MethodImpl, createContextKey } from '@connectrpc/connect';

import { ActionsRunnerModel } from '@/models';
import { RunnerService } from '@/pkg/service/runner/v1/services_connect';

import { declare } from './declare';
import { fetchTask } from './fetchTask';
import { register } from './register';

export { RunnerService };
export { default as RunnerServiceInterceptors } from './interceptors';
export type ServiceMethodImpl<T extends keyof typeof RunnerService.methods> = MethodImpl<typeof RunnerService.methods[T]>;

export const runnerModelContextKey = createContextKey<ActionsRunnerModel | undefined>(undefined, {
  description: 'current runner model',
});

// console.log('fetchTask', fetchTask2);

export const RunnerServiceImpl = {
  register,
  declare,
  fetchTask,
};
