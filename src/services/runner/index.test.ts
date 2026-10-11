import { createClient, createRouterTransport, Code } from '@connectrpc/connect';

import { RunnerService } from '@/gen/runner/v1/services_pb';
import { ActionRunner } from '@/models/actions';

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
  // 拦截器在 handler 之前查库，这里把查询桩成「查不到 runner」，让未认证分支确定性地
  // 走到；不桩的话会去读 ./database.sqlite，CI 上没有这个文件，查表会先抛原生错误，
  // 把响应变成 Internal 而不是 Unauthenticated。
  beforeEach(() => {
    vi.spyOn(ActionRunner, 'findOne').mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

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
