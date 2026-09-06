import { Constants } from '@/common/constants';

import { routes } from './connect';
import { createConnectHandler } from './handler';

export const { GET, POST } = createConnectHandler({
  prefix: Constants.Protocol.PathPrefix,
  routes,
});
