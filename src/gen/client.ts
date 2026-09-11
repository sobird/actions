import { URL } from 'node:url';

import { createClient, Client } from '@connectrpc/connect';
import { createConnectTransport, ConnectTransportOptions } from '@connectrpc/connect-node';

import { Constants } from '@/common/constants';

import { PingService } from './ping/v1/services_pb';
import { RunnerService } from './runner/v1/services_pb';

const { XRunnerUUID, XRunnerToken, XRunnerVersion, PathPrefix } = Constants.Protocol;

export type PingServiceClient = Client<typeof PingService>;
export type RunnerServiceClient = Client<typeof RunnerService>;

export function createClients(
  endpoint: string,
  token: string,
  insecure: boolean,
  uuid?: string,
  version?: string,
  options?: ConnectTransportOptions,
) {
  const baseUrl = new URL(PathPrefix, endpoint).toString();
  const nodeOptions = insecure && endpoint.startsWith('https://') ? { rejectUnauthorized: false } : {};

  // A transport for clients using the Connect protocol with Node.js `http` module
  const transport = createConnectTransport({
    baseUrl,
    httpVersion: '1.1',
    nodeOptions,
    interceptors: [
      (next) => {
        return async (req) => {
          if (uuid) {
            req.header.set(XRunnerUUID, uuid);
          }
          if (token) {
            req.header.set(XRunnerToken, token);
          }
          if (version) {
            req.header.set(XRunnerVersion, version);
          }
          return next(req);
        };
      },
    ],
    ...options,
  });

  return {
    pingServiceClient: createClient(PingService, transport),
    runnerServiceClient: createClient(RunnerService, transport),
  };
}
