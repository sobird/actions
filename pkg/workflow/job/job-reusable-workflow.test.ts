/* eslint-disable no-template-curly-in-string */
import Runner from '@/pkg/runner';

import JobReusableWorkflow from './job-reusable-workflow';

vi.setConfig({
  testTimeout: 60000,
});

vi.mock('@/pkg/runner');
vi.mock('@/pkg/runner/container/hosted');

const runner: Runner = new (Runner as any)();

describe('job-reusable-workflow test', () => {
  it('local reusable workflow skipCheckout test case', async () => {
    const job = new JobReusableWorkflow({
      id: 'job1',
      'runs-on': '${{ matrix.platform }}',
      uses: './.github/workflows/test-reusable.yml',
    });

    (runner.config as any).skipCheckout = true;
    runner.run.jobId = 'job1';
    runner.run.workflow.jobs.job1 = job;

    const executor = job.executor(runner);
    await executor.execute();
  });

  it('local reusable workflow skipCheckout test case', async () => {
    const job = new JobReusableWorkflow({
      id: 'job1',
      'runs-on': '${{ matrix.platform }}',
      uses: './.github/workflows/test-reusable-multi-matrix.yml',
    });

    (runner.config as any).skipCheckout = true;
    runner.run.jobId = 'job1';
    runner.run.workflow.jobs.job1 = job;

    const executor = job.executor(runner);
    await executor.execute();
  });

  it('local reusable workflow no skipCheckout test case', async () => {
    const job = new JobReusableWorkflow({
      id: 'job1',
      'runs-on': '${{ matrix.platform }}',
      uses: './.gitea/workflows/test-reusable-workflow.yml',
    });

    (runner.config as any).skipCheckout = false;
    runner.run.jobId = 'job1';
    runner.run.workflow.jobs.job1 = job;

    runner.context.github.repository = 'sobird/actions-test';
    runner.context.github.repositoryUrl = 'https://gitea.com/sobird/actions-test';
    runner.context.github.sha = '115f40b9fca317e4b0fec9af66b35d7a37ee69f8';
    runner.context.github.server_url = 'https://gitea.com';

    const executor = job.executor(runner);
    await executor.execute();
  });

  it('remote other repository reusable workflow test case', async () => {
    const job = new JobReusableWorkflow({
      id: 'job1',
      'runs-on': '${{ matrix.platform }}',
      uses: 'sobird/actions-test/.gitea/workflows/test-reusable-workflow.yml@115f40b9fca317e4b0fec9af66b35d7a37ee69f8',
    });

    runner.run.jobId = 'job1';
    runner.run.workflow.jobs.job1 = job;
    runner.context.github.server_url = 'https://gitea.com';

    const executor = job.executor(runner);
    await executor.execute();
  });

  it('remote reusable workflow with https test case', async () => {
    const job = new JobReusableWorkflow({
      id: 'job1',
      'runs-on': '${{ matrix.platform }}',
      uses: 'https://gitea.com/sobird/actions-test/.gitea/workflows/test-reusable-workflow.yml@115f40b9fca317e4b0fec9af66b35d7a37ee69f8',
    });

    runner.run.jobId = 'job1';
    runner.run.workflow.jobs.job1 = job;

    const executor = job.executor(runner);
    await executor.execute();
  });
});
