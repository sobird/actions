import routes from './connect';
import { nextJsApiRouter } from './connect-nextjs-adapter';

const { handler, config } = nextJsApiRouter({ routes, prefix: '/api/actions' });
export { handler as default, config };
