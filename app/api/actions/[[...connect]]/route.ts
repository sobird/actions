import Constants from '@/pkg/common/constants';

import routes from './connect';
import { nextJsApiRouter } from './connect-nextjs-adapter';

export const { GET, POST, config } = nextJsApiRouter({
  routes,
  prefix: Constants.ServerPathPrefix,
});
