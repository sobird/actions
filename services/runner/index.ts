import { type ServiceImpl } from '@connectrpc/connect';

import { RunnerService } from '@/pkg/service/runner/v1/services_connect';

import { declare } from './declare';
import { fetchTask } from './fetchTask';
import { register } from './register';

export type ServiceMethodImpl<T extends keyof typeof RunnerService.methods> = ServiceImpl< typeof RunnerService >[T];

export const RunnerServiceImpl = {
  register,
  declare,
  fetchTask,
};
