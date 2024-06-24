import docker from '.';

vi.setConfig({
  testTimeout: 20000,
});

describe('test docker pull executor', () => {
  it('docker pull test case', async () => {
    await docker.pullExecutor({
      image: 'alpine',
    }).execute();
  });

  it('docker pull force test case', async () => {
    await docker.pullExecutor({
      image: 'alpine',
      force: true,
    }).execute();
  });
});
