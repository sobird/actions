import Runner from '.';

vi.mock('.');

// @ts-expect-error
const runner: Runner = new Runner();

describe('Runner Test', () => {
  it('runner executor', async () => {
    const executor = runner.executor();
    await executor.execute();
  });
});
