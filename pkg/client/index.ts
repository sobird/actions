import { URL } from 'node:url';

import { createPromiseClient, PromiseClient } from '@connectrpc/connect';
import { createConnectTransport, ConnectTransportOptions } from '@connectrpc/connect-node';

import { PingService } from './ping/v1/services_connect';
import { RunnerService } from './runner/v1/services_connect';

const UUIDHeader = 'x-runner-uuid';
const TokenHeader = 'x-runner-token';
/**  @deprecated could be removed after Gitea 1.20 released */
const VersionHeader = 'x-runner-version';

export default class Client {
  PingServiceClient: PromiseClient<typeof PingService>;

  RunnerServiceClient: PromiseClient<typeof RunnerService>;

  constructor(
    public endpoint: string,
    private token: string,
    public insecure: boolean,
    public uuid?: string,
    public version?: string,
    public options?: ConnectTransportOptions,
  ) {
    const baseUrl = new URL('/api/actions', endpoint).toString();

    // A transport for clients using the Connect protocol with Node.js `http` module
    const transport = createConnectTransport({
      baseUrl,
      httpVersion: '1.1',
      interceptors: [
        (next) => {
          return async (req) => {
            if (uuid) {
              req.header.set(UUIDHeader, uuid);
            }
            if (token) {
              req.header.set(TokenHeader, token);
            }
            if (version) {
              req.header.set(VersionHeader, version);
            }
            return next(req);
          };
        },
      ],
      ...options,
    });

    this.PingServiceClient = createPromiseClient(PingService, transport);
    this.RunnerServiceClient = createPromiseClient(RunnerService, transport);
  }
}
