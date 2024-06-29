import { ContainerCreateOptions } from 'dockerode';
import * as tar from 'tar';

import Executor from './pkg/common/executor';
import Docker from './pkg/runner/container/docker';

const Env = ['RUNNER_TOOL_CACHE=/opt/hostedtoolcache', 'RUNNER_OS=Linux', 'RUNNER_ARCH=', 'RUNNER_TEMP=/tmp', 'LANG=C.UTF-8', 'GITHUB_WORKSPACE=/root'];

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

const pipeline = docker.pull().next(docker.create([], [])).next(docker.start());
await pipeline.execute();

const { container } = docker;

// 拷贝文件到容器
const pack1 = new tar.Pack();
pack1.write('package.json');
const pack = tar.create({ cwd: 'pkg/expression' }, ['hashFiles/index.cjs']) as any;
const ss = await container?.putArchive(pack1, {
  path: '/root',
});
console.log('ss', ss);

const exec = await container?.exec({
  Cmd: ['sh', '-c', 'node /root/hashFiles/index.cjs'], // 替换为你要执行的命令
  Env: ['patterns=/root/hashFiles/index.cjs\n/root/.profile'],
  AttachStdout: true,
  AttachStderr: true,
  WorkingDir: '/root',
  // Tty: true,
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
