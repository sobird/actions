import fs from 'node:fs';

import { ContainerCreateOptions } from 'dockerode';
import * as tar from 'tar';
import tarStream from 'tar-stream';

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
const pack1 = tarStream.pack();
pack1.entry({ name: 'my-test.txt' }, 'Hello World!');
// pack1.pipe(process.stdout);

const path = 'YourTarBall.tar';
const yourTarball = fs.createWriteStream(path);

const content = Buffer.from('content');

const h = new tar.Header({
  path: 'oof.txt',
  mode: 0o755,
  uid: 0,
  gid: 0,
  size: content.byteLength,
  mtime: new Date(),
  // ctime: new Date('2016-04-01T22:00Z'),
  // atime: new Date('2016-04-01T22:00Z'),
  // type: 'File',
});
h.encode();

const entry = new tar.ReadEntry(
  h,
);

entry.end(content);

const pack = new tar.Pack();
// const pack = tar.create({ cwd: 'pkg/expression' }, ['hashFiles/index.cjs', 'index.ts']) as any;
pack.add('README.md');
pack.add(entry);
pack.end();

const ss = await container?.putArchive(pack, {
  path: '/root',
});

pack1.pipe(yourTarball);

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

console.log('1212', Buffer.from(Buffer.from('1212')), Buffer.from('1212'));
