/* eslint-disable no-template-curly-in-string */
import fs from 'node:fs';

import Executor from '@/pkg/common/executor';
import Runner from '@/pkg/runner';
import Workflow from '@/pkg/workflow';

import Job from '.';
import Strategy from './strategy';
import { Run } from '../plan';

vi.setConfig({
  testTimeout: 10000,
});

const workflow = Workflow.Read(`${__dirname}/__mocks__/workflow.yaml`);

afterEach(() => {
  // fs.rmdirSync(runner.actionCacheDir, { recursive: true });
});

describe('test workflow job', () => {
  it('parseMatrix', () => {
    const job = new Job({
      id: 'job1',
      'runs-on': '${{ matrix.platform }}',
      strategy: new Strategy({
        matrix: {
          os: ['ubuntu-latest', 'macos-latest'],
          node: [18, 20],
        },
      }),
    });

    const matrices = job.strategy.getMatrices();

    expect(matrices).toEqual([
      { os: 'ubuntu-latest', node: 18 },
      { os: 'ubuntu-latest', node: 20 },
      { os: 'macos-latest', node: 18 },
      { os: 'macos-latest', node: 20 },
    ]);
  });

  // it('localReusableWorkflowExecutor', async () => {
  //   const executor = await workflowJob.localReusableWorkflowExecutor(runner);
  //   await executor.execute();
  // });

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

describe('test workflow job uses', () => {
  it('local reusable workflow skipCheckout test case', async () => {
    const job = new Job({
      id: 'job1',
      'runs-on': '${{ matrix.platform }}',
      uses: './.actions/workflows/reusable-workflow.yaml',
    });

    const runner = new Runner(new Run('job1', workflow), {
      skipCheckout: true,
    });

    const executor = job.usesExecutor(runner);
    await executor?.execute();
    expect(executor instanceof Executor).toBe(true);
  });

  it('local reusable workflow no skipCheckout test case', async () => {
    const job = new Job({
      id: 'job1',
      'runs-on': '${{ matrix.platform }}',
      uses: './.gitea/workflows/reusable-workflow.yaml',
    });

    const runner = new Runner(new Run('job1', workflow), {
      skipCheckout: false,
    });
    runner.context.github.repository = 'sobird/actions-test';
    runner.context.github.repositoryUrl = 'https://gitea.com/sobird/actions-test';
    runner.context.github.sha = '531aeeb9a2443705d9154fb543c4d6685a4e996e';
    runner.context.github.server_url = 'https://gitea.com';

    const executor = job.usesExecutor(runner);
    await executor?.execute();
    expect(executor instanceof Executor).toBe(true);
  });

  it('remote reusable workflow test case', async () => {
    const job = new Job({
      id: 'job1',
      'runs-on': '${{ matrix.platform }}',
      uses: 'sobird/actions-test/.gitea/workflows/reusable-workflow.yaml@531aeeb9a2443705d9154fb543c4d6685a4e996e',
    });

    const runner = new Runner(new Run('job1', workflow), {});
    runner.context.github.server_url = 'https://gitea.com';

    const executor = job.usesExecutor(runner);
    // await executor?.execute();
    expect(executor instanceof Executor).toBe(true);
  });

  it('remote reusable workflow with https test case', async () => {
    const job = new Job({
      id: 'job1',
      'runs-on': '${{ matrix.platform }}',
      uses: 'https://gitea.com/sobird/actions-test/.gitea/workflows/reusable-workflow.yaml@531aeeb9a2443705d9154fb543c4d6685a4e996e',
    });

    const runner = new Runner(new Run('job1', workflow), {});
    const executor = job.usesExecutor(runner);
    await executor?.execute();
    expect(executor instanceof Executor).toBe(true);
  });
});
