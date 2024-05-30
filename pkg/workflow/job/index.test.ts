/* eslint-disable no-template-curly-in-string */
import Runner from '@/pkg/runner';

import Workflow from '..';
import { Run } from '../plan';

const workflow = Workflow.Read(`${__dirname}/__mocks__/workflow.yaml`);
const runner = new Runner(new Run('job1', workflow), {
  noSkipCheckout: true,
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

  it('localReusableWorkflowExecutor', async () => {
    const executor = await workflowJob.localReusableWorkflowExecutor(runner);
    await executor.execute();
  });
});
