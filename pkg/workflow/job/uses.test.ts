import fs from 'node:fs';

import Executor from '@/pkg/common/executor';
import Runner from '@/pkg/runner';

import Uses from './uses';
import Workflow from '..';
import { Run } from '../plan';

const workflow = Workflow.Read(`${__dirname}/__mocks__/workflow.yaml`);

describe('test workflow job uses', () => {
  it('local reusable workflow skipCheckout test case', async () => {
    const runner = new Runner(new Run('job1', workflow), {
      skipCheckout: true,
    });
    const uses = new Uses('./.actions/workflows/reusable-workflow.yaml');
    const executor = uses.executor(runner);
    // await executor?.execute();
    expect(executor instanceof Executor).toBe(true);
  });

  it('local reusable workflow no skipCheckout test case', async () => {
    const runner = new Runner(new Run('job1', workflow), {
      skipCheckout: false,
    });
    runner.context.github.repository = 'sobird/actions-test';
    runner.context.github.repositoryUrl = 'https://gitea.com/sobird/actions-test';
    runner.context.github.sha = '531aeeb9a2443705d9154fb543c4d6685a4e996e';
    runner.context.github.server_url = 'https://gitea.com';

    const uses = new Uses('./.gitea/workflows/reusable-workflow.yaml');
    const executor = uses.executor(runner);
    // await executor?.execute();

    expect(executor instanceof Executor).toBe(true);

    afterEach(() => {
      // fs.rmdirSync(runner.actionCacheDir, { recursive: true });
    });
  });
});
