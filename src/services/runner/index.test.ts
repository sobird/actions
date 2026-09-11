import { createClient, createRouterTransport, Code } from '@connectrpc/connect';

import { RunnerService } from '@/gen/runner/v1/services_pb';

import { routes } from '../../../app/api/actions/[[...connect]]/connect';

function createTestClient() {
  // Create an in-memory transport with the routes from connect.ts
  const transport = createRouterTransport(routes, {
    transport: {
      baseUrl: 'http://test.com/',
    },
  });

  return createClient(RunnerService, transport);
}

describe('RunnerService register', () => {
  it('getServers', async () => {
    const client = createTestClient();

    await expect(
      client.register({
        token: 'ddd',
      }),
    ).rejects.toMatchObject({
      code: Code.InvalidArgument,
      rawMessage: 'missing runner token, name',
    });
  });
});

describe('RunnerService update methods', () => {
  // The interceptor runs before the handler, so an unauthenticated call proves
  // the method is registered: an unregistered one fails with Unimplemented.
  it.each(['updateTask', 'updateLog'] as const)('%s is registered', async (method) => {
    const client = createTestClient();

    await expect(client[method]({} as never)).rejects.toMatchObject({
      code: Code.Unauthenticated,
      rawMessage: 'unregistered runner',
    });
  });
});
