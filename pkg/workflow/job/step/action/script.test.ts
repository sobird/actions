import Runner from '@/pkg/runner';

import StepActionScript from './script';

vi.mock('@/pkg/runner');

const runner: Runner = new (Runner as any)();

const step = new StepActionScript({
  id: '__run',
  run: 'echo hello world!',
  env: {
    name: 'sobird',
  },
  with: {
    'who-to-greet': 'actions',
  },
});

describe('step action script run test', async () => {
  it('run', async () => {
    const main = step.main();
    await main.execute({ runner });
  });
});
