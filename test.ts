import fs from 'node:fs';
import path from 'node:path';

import { ContainerCreateOptions } from 'dockerode';

import Docker from '@/pkg/runner/container/docker';

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

// const container = Docker.docker.getContainer('1c32aaddcb52ba4055e502c362b1ecb372704eeabe9222ed387a19b00d0a5ac0');

// const tar = await container.getArchive({
//   path: '/root/package.json',
// });

// const ws = fs.createWriteStream('test.tar');
// tar.pipe(ws);

// process.stdin.on('data', (data) => {
//   console.log('data', data);
// });

process.stdout.write('ddd');
