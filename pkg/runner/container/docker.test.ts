import { ContainerCreateOptions } from 'dockerode';

import Docker from './docker';

const Env = ['RUNNER_TOOL_CACHE=/opt/hostedtoolcache', 'RUNNER_OS=Linux', 'RUNNER_ARCH=', 'RUNNER_TEMP=/tmp', 'LANG=C.UTF-8'];

const containerCreateOptions: ContainerCreateOptions = {
  Cmd: [],
  Entrypoint: ['/bin/sleep', '3600'],
  WorkingDir: '/',
  Image: 'alpine:latest',
  name: 'alpine-test',
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
  const removeExecutor = docker.remove();
  await removeExecutor.execute();
});

vi.setConfig({
  testTimeout: 20000,
});

describe('test Docker Container', () => {
  it('docker pull image test case', async () => {
    const pullExecutor = docker.pull();
    await pullExecutor.execute();
    // expect(docker.container).not.toBeUndefined();
  });

  it('docker create container test case', async () => {
    const createExecutor = docker.create([], []);
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

  it('docker stop container test case', async () => {
    // const startExecutor = docker.start();
    // await startExecutor.execute();

    // const stopExecutor = docker.stop();
    // await stopExecutor.execute();
    // console.log('ddd', docker.container);
    // expect(docker.container).not.toBeUndefined();
  });
});
