import Runner from '@/pkg/runner';

import StepActionScript from './step-action-script';

vi.mock('@/pkg/runner');

const runner: Runner = new (Runner as any)();

const step = new StepActionScript({
  id: '__run',
  run: 'echo hello world!',
});

describe('step action script run test', async () => {
  it('run', async () => {
    const main = step.main(runner);
    await main.execute();
  });
});
