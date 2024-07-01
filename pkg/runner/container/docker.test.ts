import fs from 'node:fs';

import { ContainerCreateOptions } from 'dockerode';
import * as tar from 'tar';

import Docker from './docker';

const Env = ['RUNNER_TOOL_CACHE=/opt/hostedtoolcache', 'RUNNER_OS=Linux', 'RUNNER_ARCH=', 'RUNNER_TEMP=/tmp', 'LANG=C.UTF-8'];

const containerCreateOptions: ContainerCreateOptions = {
  Cmd: [],
  Entrypoint: ['/bin/sleep', '3600'],
  WorkingDir: '/root',
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

  it('docker put content to container test case', async () => {
    const putExecutor = docker.put('test', {
      name: 'test.txt',
      body: 'this is test content',
    }, {
      name: 'sobird.txt',
      body: 'this is sobird content',
    });
    await putExecutor.execute();
  });

  it('put dir to container test case', async () => {
    const copyDirExecutor = docker.putDir('mix-test', '/Users/sobird/mix');
    await copyDirExecutor.execute();
  });

  it('put archive to container test case', async () => {
    const archive = tar.create({ cwd: __dirname }, ['.']) as unknown as NodeJS.ReadableStream;

    const putArchiveExecutor = docker.putArchive('put-archive-test', archive);
    await putArchiveExecutor.execute();
  });
});
