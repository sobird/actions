/* eslint-disable no-template-curly-in-string */
import Runner from '@/pkg/runner';

import Uses from '.';

vi.setConfig({
  testTimeout: 60000,
});

vi.mock('@/pkg/runner');

const runner: Runner = new (Runner as any)({}, {
  serverInstance: 'gitea.com',
});

describe('uses-reusable-workflow test', () => {
  it('local reusable workflow skipCheckout test case', async () => {
    const uses = new Uses('./.github/workflows/test-reusable.yml');

    (runner.config as any).skipCheckout = true;

    const executor = uses.executor(runner);
    await executor?.execute(runner);
  });

  it('local reusable workflow multi matrix test case', async () => {
    const uses = new Uses('./.github/workflows/test-reusable-multi-matrix.yml');

    (runner.config as any).skipCheckout = true;
    runner.context.github.sha = 'HEAD';

    const executor = uses.executor(runner);
    await executor?.execute(runner);
  });

  it('local reusable workflow no skipCheckout test case', async () => {
    const uses = new Uses('./.gitea/workflows/test-reusable-workflow.yml');

    (runner.config as any).skipCheckout = false;

    runner.context.github.repository = 'sobird/actions-test';
    runner.context.github.repositoryUrl = 'https://gitea.com/sobird/actions-test';
    runner.context.github.sha = '115f40b9fca317e4b0fec9af66b35d7a37ee69f8';
    runner.context.github.server_url = 'https://gitea.com';

    const executor = uses.executor(runner);
    await executor?.execute(runner);
  });

  it('remote other repository reusable workflow test case', async () => {
    const uses = new Uses('sobird/actions-test/.gitea/workflows/test-reusable-workflow.yml@115f40b9fca317e4b0fec9af66b35d7a37ee69f8');

    runner.context.github.server_url = 'https://gitea.com';

    const executor = uses.executor(runner);
    await executor?.execute(runner);
  });

  it('remote reusable workflow with https test case', async () => {
    const uses = new Uses('https://gitea.com/sobird/actions-test/.gitea/workflows/test-reusable-workflow.yml@115f40b9fca317e4b0fec9af66b35d7a37ee69f8');

    const executor = uses.executor(runner);
    await executor?.execute(runner);
  });
});
