import Runner from '.';

vi.mock('.');

const runner: Runner = new (Runner as any)();

describe('Runner Test', () => {
  it('runner executor', async () => {
    const executor = runner.executor();
    await executor.execute();
  });
});
