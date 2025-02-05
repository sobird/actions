import { ConnectRouter } from '@connectrpc/connect';

import { PingService } from '@/pkg/service/ping/v1/services_pb';
import { RunnerService, RunnerServiceImpl, RunnerServiceInterceptors } from '@/services/runner';

export const routes = (router: ConnectRouter) => {
  // Register your service implementations here
  // router.rpc(PingService.method.ping, async (req) => {
  //   return {
  //     data: `Hello, ${req.data}`,
  //   };
  // });

  router.service(PingService, {
    ping: (req) => {
      return {
        data: `Hello, ${req.data}`,
      };
    },
  });

  router.service(RunnerService, RunnerServiceImpl, {
    interceptors: RunnerServiceInterceptors,
  });
};
