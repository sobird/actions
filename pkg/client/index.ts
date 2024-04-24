import { URL } from 'node:url';
import { createPromiseClient } from '@connectrpc/connect';
import { createConnectTransport, ConnectTransportOptions } from '@connectrpc/connect-node';
import { PingService } from './ping/v1/services_connect';
import { RunnerService } from './runner/v1/services_connect';

const UUIDHeader = 'x-runner-uuid';
const TokenHeader = 'x-runner-token';
/**
 * @deprecated could be removed after Gitea 1.20 released
 */
const VersionHeader = 'x-runner-version';

function client(
  endpoint: string,
  insecure: boolean,
  uuid: string,
  token: string,
  version: string,
  options?: ConnectTransportOptions,
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

  const PingServiceClient = createPromiseClient(PingService, transport);
  const RunnerServiceClient = createPromiseClient(RunnerService, transport);

  return {
    // 合并两个服务的方法
    ...PingServiceClient,
    ...RunnerServiceClient,
    PingServiceClient,
    RunnerServiceClient,
    endpoint,
    insecure,
  };
}

export default client;
