import path from 'node:path';

import { WellKnownDirectory } from '@/common/constants';
import Executor from '@/common/executor';
import Runner from '@/runner';
import type { ActionProps } from '@/runner/action';
import HostedContainer from '@/runner/container/hosted';
import type StepAction from '@/workflow/job/step/action';

import NodeJSAction, { type NodeJSActionProps } from './nodejs';

vi.mock('@/runner');
vi.mock('@/runner/container/hosted');

const ACTION_DIR = path.join(WellKnownDirectory.Actions, 'hello-world-javascript-action');

/** 只喂 pre/main/post 真正会读的那几个字段，免得起一个真实的 StepAction */
function fakeStepAction(withInputs: Record<string, string> = {}): StepAction {
  return {
    environment: {},
    with: { evaluate: () => withInputs },
    env: { evaluate: () => ({}) },
    uses: { uses: 'actions/hello-world-javascript-action@v1' },
  } as unknown as StepAction;
}

/**
 * RunsProps 把 image / entrypoint / args 这些只对 docker action 有意义的字段也标成了必填，
 * JS action 的 runs 因此过不了类型检查，这里显式跨过去。
 */
function createAction(runs: NodeJSActionProps['runs'], dir: string = ACTION_DIR) {
  const props = {
    name: 'Hello World Javascript Action',
    description: 'Greet someone and record the time',
    inputs: {
      'who-to-greet': {
        description: 'Who to greet',
        required: true,
        default: 'World',
      },
    },
    outputs: {
      time: {
        description: 'The time we greeted you',
        value: '',
      },
    },
    runs,
  };

  const action = new NodeJSAction(props as unknown as ActionProps);
  action.Dir = dir;
  return action;
}

function setup(withInputs: Record<string, string> = {}) {
  const runner: Runner = new (Runner as any)();
  const container: HostedContainer = new (HostedContainer as any)();
  runner.container = container;
  runner.stepAction = fakeStepAction(withInputs);

  return {
    runner,
    exec: vi.spyOn(container, 'exec').mockImplementation(() => new Executor()),
  };
}

describe('NodeJSAction', () => {
  it('runs pre, main and post with the entry point each of them declares', async () => {
    const { runner, exec } = setup();
    const action = createAction({
      using: 'node20',
      pre: 'dist/pre.js',
      main: 'dist/index.js',
      post: 'dist/post.js',
    });

    await action.Pre.execute(runner);
    await action.Main.execute(runner);
    await action.Post.execute(runner);

    expect(exec.mock.calls.map(([command]) => command)).toEqual([
      ['node', path.posix.join(ACTION_DIR, 'dist/pre.js')],
      ['node', path.posix.join(ACTION_DIR, 'dist/index.js')],
      ['node', path.posix.join(ACTION_DIR, 'dist/post.js')],
    ]);
  });

  it('hands the step inputs to the action as INPUT_* environment variables', async () => {
    const { runner, exec } = setup({ 'who-to-greet': 'Mona' });
    const action = createAction({ using: 'node20', main: 'dist/index.js' });

    await action.Main.execute(runner);

    expect(exec).toHaveBeenCalledWith(['node', path.posix.join(ACTION_DIR, 'dist/index.js')], {
      env: { 'INPUT_WHO-TO-GREET': 'Mona' },
    });
  });

  it("falls back to the input's default when the step passes no value", async () => {
    const { runner, exec } = setup();
    const action = createAction({ using: 'node20', main: 'dist/index.js' });

    await action.Main.execute(runner);

    expect(exec).toHaveBeenCalledWith(['node', path.posix.join(ACTION_DIR, 'dist/index.js')], {
      env: { 'INPUT_WHO-TO-GREET': 'World' },
    });
  });

  it('skips pre and post when the action declares only main', async () => {
    const { runner, exec } = setup();
    const action = createAction({ using: 'node20', main: 'dist/index.js' });

    await action.Pre.execute(runner);
    await action.Post.execute(runner);

    expect(exec).not.toHaveBeenCalled();
  });
});
