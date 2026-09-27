import Executor from '@/common/executor';
import Runner from '@/runner';
import type { ActionProps } from '@/runner/action';
import type { StepProps } from '@/workflow/job/step';
import type StepAction from '@/workflow/job/step/action';

import CompositeAction from './composite';

vi.mock('@/runner');
vi.mock('@/runner/container/hosted');

/** 只喂 SetEnvironment / PrintDetails 会读的那几个字段，免得起一个真实的 StepAction。 */
function fakeStepAction(): StepAction {
  return {
    environment: {},
    with: { evaluate: () => ({}) },
    env: { evaluate: () => ({}) },
    uses: { uses: './test/actions/composite' },
  } as unknown as StepAction;
}

/**
 * RunsProps 把 docker / javascript action 才需要的字段也标成了必填，复合动作的 runs
 * 因此过不了类型检查，这里显式跨过去。
 */
function createAction(steps: StepProps[]) {
  return new CompositeAction({
    name: 'Test Composite Action',
    description: 'Test action uses composite',
    inputs: {},
    outputs: {},
    runs: {
      using: 'composite',
      steps,
    },
  } as unknown as ActionProps);
}

/** 内嵌步骤都跑在容器里，第一个 exec 失败当作出错的 `run` 步骤。 */
function setup() {
  const runner: Runner = new (Runner as any)();
  const container = runner.container!;
  runner.stepAction = fakeStepAction();

  let executions = 0;
  const exec = vi
    .spyOn(container, 'exec')
    .mockImplementation(() => (executions++ === 0 ? Executor.Error(new Error('exit 1')) : new Executor()));
  vi.spyOn(container, 'putContent').mockImplementation(() => new Executor());

  return { runner, exec };
}

describe('CompositeAction', () => {
  it('runs the embedded steps, and a failed one stops the rest', async () => {
    const { runner, exec } = setup();
    const action = createAction([
      { id: 'fails', run: 'exit 1' },
      { id: 'after', run: 'echo unreachable' },
    ]);

    await action.Main.execute(runner);

    expect(exec).toHaveBeenCalledTimes(1);
  });

  it('runs the embedded steps even when the job has already failed', async () => {
    const { runner, exec } = setup();
    // 作业此前的步骤失败了，复合动作自己的结果仍从成功起步
    runner.context.job.status = 'failure';
    const action = createAction([{ id: 'runs', run: 'echo hello' }]);

    await action.Main.execute(runner);

    expect(exec).toHaveBeenCalledTimes(1);
  });

  it('starts the composite result over instead of inheriting the one around it', async () => {
    const { runner, exec } = setup();
    // 外层复合动作跑到这一步时已经失败了
    runner.context.github.action_status = 'failure';
    const action = createAction([{ id: 'runs', run: 'echo hello' }]);

    await action.Main.execute(runner);

    expect(exec).toHaveBeenCalledTimes(1);
  });

  it('keeps the failure in the composite result across a later successful step', async () => {
    const { runner, exec } = setup();
    const action = createAction([
      { id: 'fails', run: 'exit 1' },
      // always() 的这步照跑，但复合动作的结果不会因此回到 success
      { id: 'recovers', run: 'echo recovered', if: 'always()' },
      { id: 'after', run: 'echo unreachable', if: 'success()' },
    ]);

    await action.Main.execute(runner);

    expect(exec).toHaveBeenCalledTimes(2);
  });
});
