import Executor from '@/common/executor';
import Runner from '@/runner';
import HostedContainer from '@/runner/container/hosted';

import StepActionScript from './script';

vi.mock('@/runner');
vi.mock('@/runner/container/hosted');

const runner: Runner = new (Runner as any)();
const hostedContainer: HostedContainer = new (HostedContainer as any)();

const step = new StepActionScript({
  id: '__run',
  run: 'echo hello world!',
  env: {
    name: 'script',
  },
  with: {
    name: 'sobird',
  },
});

runner.stepAction = step;

describe('step action script test', async () => {
  it('run normal main script', async () => {
    runner.container = hostedContainer;
    const containerExecMock = vi.spyOn(runner.container, 'exec').mockImplementation((command, options) => {
      console.log('command', command);
      console.log('options', options);
      return new Executor();
    });

    const main = step.main();
    await main.execute(runner);
    expect(containerExecMock).toHaveBeenCalled();
  });
});
