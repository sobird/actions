import { ContainerCreateOptions } from 'dockerode';

import Docker from './docker';

const Env = ['RUNNER_TOOL_CACHE=/opt/hostedtoolcache', 'RUNNER_OS=Linux', 'RUNNER_ARCH=', 'RUNNER_TEMP=/tmp', 'LANG=C.UTF-8'];

const containerCreateOptions: ContainerCreateOptions = {
  Cmd: [],
  Entrypoint: ['/bin/sleep', '3600'],
  WorkingDir: '/',
  Image: 'alpine',
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
  // const findExecutor = docker.find();
  // await findExecutor.execute();
  // docker.container?.remove();
});

describe('test Docker Container', () => {
  it('docker find container before create test case', async () => {
    const findExecutor = docker.find();
    await findExecutor.execute();
    expect(docker.container?.id).toBeUndefined();
  });

  // it('docker create container test case', async () => {
  //   const createExecutor = docker.create([], []);
  //   await createExecutor.execute();
  //   // expect(docker.container).not.toBeUndefined();
  // });

  // it('docker find container after create test case', async () => {
  //   const findExecutor = docker.find();
  //   await findExecutor.execute();
  //   // expect(docker.container).not.toBeUndefined();
  // });

  // it('docker start container test case', async () => {
  //   // const startExecutor = docker.start();
  //   // await startExecutor.execute();

  //   const findExecutor = docker.find();
  //   await findExecutor.execute();
  //   console.log('ddd', docker.container);
  //   // expect(docker.container).not.toBeUndefined();
  // });
});
