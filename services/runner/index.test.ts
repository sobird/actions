import { createClient, createRouterTransport, ConnectError } from '@connectrpc/connect';

import connect from '@/app/api/actions/[[...connect]]/connect';
import { RunnerService } from '@/pkg/service/runner/v1/services_connect';

describe('RunnerService register', () => {
  it('getServers', async () => {
    // Create an in-memory transport with the routes from connect.ts
    const transport = createRouterTransport(connect, {
      transport: {
        baseUrl: 'http://test.com/',
      },
    });

    const client = createClient(RunnerService, transport);

    expect(client.register({
      token: 'ddd',
    })).rejects.toThrowError(new ConnectError('missing runner token, name', 3));
  });
});
