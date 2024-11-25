import { type ServiceType } from '@bufbuild/protobuf';
import { type ServiceImpl, type MethodImpl, createContextKey } from '@connectrpc/connect';

import { ActionsRunnerModel } from '@/models';
import { RunnerService } from '@/pkg/service/runner/v1/services_connect';

import { declare } from './declare';
import { fetchTask } from './fetchTask';
import { register } from './register';

export { RunnerService } from '@/pkg/service/runner/v1/services_connect';

export { default as RunnerInterceptors } from './interceptors';

export type ServiceMethodImpl<T extends keyof typeof RunnerService.methods> = ServiceImpl< typeof RunnerService >[T];

export type ServiceMethodImpl2<T extends ServiceType, K extends keyof T['methods']> = ServiceImpl<T>[K];
export type RunnerServiceMethodImpl<M extends keyof typeof RunnerService.methods > = ServiceMethodImpl2<typeof RunnerService, M>;

export type Test< K extends keyof typeof RunnerService.methods> = MethodImpl<typeof RunnerService.methods[K]>;

export type Test2 = typeof RunnerService.methods;

export const runnerModelContextKey = createContextKey<ActionsRunnerModel | null>(null, {
  description: 'current runner model',
});

export const RunnerServiceImpl = {
  register,
  declare,
  fetchTask,
};
