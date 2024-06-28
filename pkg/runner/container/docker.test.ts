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
  // const removeExecutor = docker.remove();
  // await removeExecutor.execute();
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

  it('docker container exec test case', async () => {
    const { container } = docker;
    const exec = await container?.exec({
      Cmd: ['sh', '-c', 'ls /'], // 替换为你要执行的命令
      AttachStdout: true,
      AttachStderr: true,
      Tty: true,
    });

    const stream = await exec?.start({ stdin: true });
    stream?.on('data', (data) => {
      process.stdout.write(data);
    });
    stream?.on('error', (err) => {
      console.error('Error on exec stream:', err);
    });
    stream?.on('end', () => {
      console.log('Exec stream ended.');
    });

    // docker.modem.demuxStream(stream, process.stdout, process.stderr);

    // , (err, exec) => {
    //   if (err) {
    //     console.error('Error executing command:', err);
    //     return;
    //   }

    //   console.log('exec', exec);

    //   // exec?.resize({ h: 720, w: 120 }); // 根据需要设置终端大小

    //   // 启动 exec 实体
    //   const stream1 = exec?.start({}, (err, stream) => {
    //     if (err) {
    //       console.error('Error starting exec stream:', err);
    //       return;
    //     }

    //     // 监听输出
    //     stream?.on('data', (data) => {
    //       process.stdout.write(data);
    //     });
    //     stream?.on('error', (err) => {
    //       console.error('Error on exec stream:', err);
    //     });
    //     stream?.on('end', () => {
    //       console.log('Exec stream ended.');
    //     });
    //   });
    // }
    // console.log('res', res);
  });
});
