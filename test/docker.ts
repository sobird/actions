import fs from 'node:fs';
import path from 'node:path';
import { Writable, Readable } from 'node:stream';

import { ContainerCreateOptions } from 'dockerode';

import Docker from '@/pkg/runner/container/docker';

const Env = ['RUNNER_TOOL_CACHE=/opt/hostedtoolcache', 'RUNNER_OS=Linux', 'RUNNER_ARCH=', 'RUNNER_TEMP=/tmp', 'LANG=C.UTF-8'];

const containerCreateOptions: ContainerCreateOptions = {
  Cmd: [],
  Entrypoint: ['/bin/sleep', '3600'],
  WorkingDir: '/root',
  Image: 'node:lts-slim',
  name: 'node-lts-slim',
  Env,
  HostConfig: {
    AutoRemove: true,
    Privileged: true,
    UsernsMode: '',
  },
  platform: '',
};

const docker = new Docker(containerCreateOptions);

const executer = docker.start();
await executer.execute();

const putContentExecutor = docker.putContent('', {
  name: 'print_message.sh',
  mode: 0o777,
  body: `#!/bin/bash

  # 定义要输出的内容
  message="Hello, World!"

  # 循环五次
  for i in {1..5}
  do
    echo $message $i
    # 每次输出后休眠一秒
    sleep 1
  done
  `,
});
await putContentExecutor.execute();

const { container } = docker;
console.log('container', container?.id);

const exec = await container?.exec({
  Cmd: ['./print_message.sh'],
  WorkingDir: '/root',
  AttachStdout: true,
  AttachStderr: true,
});

const wrs = await exec?.start({});

// wrs.on('data', (chunk) => {
//   console.log('chunk', chunk);
// });

const out = new Writable({
  write: (chunk, enc, next) => {
    console.log('chunk', chunk, enc);

    next();
  },
});

wrs?.pipe(out);

const inspect = await exec?.inspect();
console.log('inspect', inspect);
