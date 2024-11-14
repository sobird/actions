import { ConnectRouter } from '@connectrpc/connect';

import { PingService } from '@/pkg/client/ping/v1/services_connect';

export default (router: ConnectRouter) => {
  // implement rpc Say(SayRequest) returns (SayResponse)
  router.rpc(PingService, PingService.methods.ping, async (req) => {
    return {
      sentence: `you said: ${req}`,
    };
  });
};
