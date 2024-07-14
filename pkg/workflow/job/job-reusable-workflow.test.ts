/* eslint-disable no-template-curly-in-string */
import Runner from '@/pkg/runner';

import JobReusableWorkflow from './job-reusable-workflow';

vi.setConfig({
  testTimeout: 10000,
});

vi.mock('@/pkg/runner');

const runner: Runner = new (Runner as any)();

describe('job-reusable-workflow test', () => {
  it('local reusable workflow skipCheckout test case', async () => {
    const job = new JobReusableWorkflow({
      id: 'job1',
      'runs-on': '${{ matrix.platform }}',
      uses: './.github/workflows/test-reusable-workflow.yml',
    });

    runner.config.skipCheckout = true;
    runner.run.jobId = 'job1';
    runner.run.workflow.jobs.job1 = job;

    const executor = job.executor(runner);
    await executor.execute();
  });

  it('local reusable workflow no skipCheckout test case', async () => {
    const job = new JobReusableWorkflow({
      id: 'job1',
      'runs-on': '${{ matrix.platform }}',
      uses: './.gitea/workflows/reusable-workflow.yaml',
    });

    runner.config.skipCheckout = false;
    runner.run.jobId = 'job1';
    runner.run.workflow.jobs.job1 = job;

    runner.context.github.repository = 'sobird/actions-test';
    runner.context.github.repositoryUrl = 'https://gitea.com/sobird/actions-test';
    runner.context.github.sha = '531aeeb9a2443705d9154fb543c4d6685a4e996e';
    runner.context.github.server_url = 'https://gitea.com';

    const executor = job.executor(runner);
    await executor.execute();
  });

  it('remote other repository reusable workflow test case', async () => {
    const job = new JobReusableWorkflow({
      id: 'job1',
      'runs-on': '${{ matrix.platform }}',
      uses: 'sobird/actions-test/.gitea/workflows/reusable-workflow.yaml@531aeeb9a2443705d9154fb543c4d6685a4e996e',
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
      uses: 'https://gitea.com/sobird/actions-test/.gitea/workflows/reusable-workflow.yaml@531aeeb9a2443705d9154fb543c4d6685a4e996e',
    });

    runner.run.jobId = 'job1';
    runner.run.workflow.jobs.job1 = job;

    const executor = job.executor(runner);
    await executor.execute();
  });
});
