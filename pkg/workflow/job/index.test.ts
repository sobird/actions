/* eslint-disable no-template-curly-in-string */
import Runner from '@/pkg/runner';

import Workflow from '..';
import { Run } from '../plan';

const workflow = Workflow.Read(`${__dirname}/__mocks__/workflow.yaml`);
const runner = new Runner(new Run('job1', workflow), {
  skipCheckout: true,
});
const workflowJob = workflow.jobs.job1;
workflowJob.name = 'job1';
workflowJob.uses = `${__dirname}/__mocks__/workflow-2.yml`;

vi.setConfig({
  testTimeout: 10000,
});

describe('test workflow job', () => {
  it('parseMatrix', () => {
    const jobNames = workflowJob.spread().map((job) => {
      return job.name;
    });

    expect(jobNames).toEqual([
      'job1 (ubuntu-latest, 18)',
      'job1 (ubuntu-latest, 20)',
      'job1 (macos-latest, 18)',
      'job1 (macos-latest, 20)',
    ]);
  });

  // it('localReusableWorkflowExecutor', async () => {
  //   const executor = await workflowJob.localReusableWorkflowExecutor(runner);
  //   await executor.execute();
  // });

  it('localReusableWorkflowExecutor noSkipCheckout', async () => {
    workflowJob.uses = './.gitea/workflows/reusable-workflow.yaml';
    const runnerCase = new Runner(new Run('job1', workflow), {
      skipCheckout: false,
    });
    runnerCase.context.github.repository = 'sobird/actions-test';
    runnerCase.context.github.repositoryUrl = 'https://gitea.com/sobird/actions-test';
    runnerCase.context.github.sha = '531aeeb9a2443705d9154fb543c4d6685a4e996e';
    const executor = await workflowJob.localReusableWorkflowExecutor(runnerCase);
    await executor.execute();
  });
});
