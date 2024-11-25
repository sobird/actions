import { Protocol } from '@/pkg/common/constants';

import { routes } from './connect';
import { createConnectHandler } from './handler';

export const { GET, POST } = createConnectHandler({
  prefix: Protocol.PathPrefix,
  routes,
});
