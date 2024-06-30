import { ContainerCreateOptions } from 'dockerode';

import Docker from './docker';

const Env = ['RUNNER_TOOL_CACHE=/opt/hostedtoolcache', 'RUNNER_OS=Linux', 'RUNNER_ARCH=', 'RUNNER_TEMP=/tmp', 'LANG=C.UTF-8'];

const containerCreateOptions: ContainerCreateOptions = {
  Cmd: [],
  Entrypoint: ['/bin/sleep', '3600'],
  WorkingDir: '/',
  Image: 'node',
  name: 'node-test',
  Env,
  HostConfig: {
    AutoRemove: true,
    Privileged: true,
    UsernsMode: '',
  },
  platform: '',
};

const docker = new Docker(containerCreateOptions);

afterAll(async () => {
  // const removeExecutor = docker.remove();
  // await removeExecutor.execute();
});

vi.setConfig({
  testTimeout: 60000,
});

describe('test Docker Container', () => {
  it('docker pull image test case', async () => {
    const pullExecutor = docker.pull();
    await pullExecutor.execute();
    // expect(docker.container).not.toBeUndefined();
  });

  it('docker create container test case', async () => {
    const createExecutor = docker.create();
    await createExecutor.execute();
    const id = docker.container?.id;
    expect(id).not.toBeUndefined();
  });

  it('docker start container test case', async () => {
    const startExecutor = docker.start();
    await startExecutor.execute();

    const id = docker.container?.id;
    expect(id).not.toBeUndefined();
  });

  it('docker copy content to container test case', async () => {
    const copyExecutor = docker.copy({
      name: 'sobird.txt',
      body: 'this is content',
    }, {
      name: 'test.txt',
      body: 'this is test content',
    });
    await copyExecutor.execute();
  });

  it('docker copy dir to container test case', async () => {
    const copyDirExecutor = docker.copyDir('/Users/sobird/mix');
    await copyDirExecutor.execute();
  });
});
