import Runner from '@/pkg/runner';

import ActionStepScript from './script';

vi.mock('@/pkg/runner');

const runner: Runner = new (Runner as any)();

const step = new ActionStepScript({
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
