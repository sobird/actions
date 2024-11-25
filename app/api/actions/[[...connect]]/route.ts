import Constants from '@/pkg/common/constants';

import { routes } from './connect';
import { createConnectHandler } from './handler';

export const { GET, POST } = createConnectHandler({
  prefix: Constants.ServerPathPrefix,
  routes,
});
