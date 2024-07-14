/* eslint-disable no-template-curly-in-string */

import Runner from '@/pkg/runner';

import Job from './job';

vi.setConfig({
  testTimeout: 10000,
});

vi.mock('@/pkg/runner');

const runner: Runner = new (Runner as any)();

afterEach(() => {
  // fs.rmdirSync(runner.actionCacheDir, { recursive: true });
});

describe('test workflow job', () => {
  it('job strategy getMatrices test case', () => {
    const job = new Job({
      id: 'job1',
      'runs-on': '${{ matrix.platform }}',
      strategy: {
        matrix: {
          os: ['ubuntu-latest', 'macos-latest'],
          node: [18, 20],
        },
      },
    });

    const matrices = job.strategy.getMatrices();

    expect(matrices).toEqual([
      { os: 'ubuntu-latest', node: 18 },
      { os: 'ubuntu-latest', node: 20 },
      { os: 'macos-latest', node: 18 },
      { os: 'macos-latest', node: 20 },
    ]);
  });

  it('job executor test case', async () => {
    const job = new Job({
      id: 'job1',
      'runs-on': '${{ matrix.platform }}',
    });
    const executor = job.executor(runner);
    await executor.execute();
  });

  // it('localReusableWorkflowExecutor noSkipCheckout', async () => {
  //   workflowJob.uses = './.gitea/workflows/reusable-workflow.yaml';
  //   const runnerCase = new Runner(new Run('job1', workflow), {
  //     skipCheckout: false,
  //   });
  //   runnerCase.context.github.repository = 'sobird/actions-test';
  //   runnerCase.context.github.repositoryUrl = 'https://gitea.com/sobird/actions-test';
  //   runnerCase.context.github.sha = '531aeeb9a2443705d9154fb543c4d6685a4e996e';
  //   const executor = await workflowJob.localReusableWorkflowExecutor(runnerCase);
  //   await executor.execute();
  // });
});
