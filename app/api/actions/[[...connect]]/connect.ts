import { ConnectRouter } from '@connectrpc/connect';

import { PingResponse } from '@/pkg/service/ping/v1/messages_pb';
import { PingService } from '@/pkg/service/ping/v1/services_connect';
import { RunnerService, RunnerServiceImpl, RunnerServiceInterceptors } from '@/services/runner';

export const routes = (router: ConnectRouter) => {
  // Register your service implementations here
  // router.rpc(PingService, PingService.methods.ping, async (req) => {
  //   return new PingResponse({
  //     data: `Hello, ${req.data}`,
  //   });
  // });

  router.service(PingService, {
    ping: (req) => {
      return new PingResponse({
        data: `Hello, ${req.data}`,
      });
    },
  });

  router.service(RunnerService, RunnerServiceImpl, {
    interceptors: RunnerServiceInterceptors,
  });
};
