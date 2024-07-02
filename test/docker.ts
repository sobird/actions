import fs from 'node:fs';
import path from 'node:path';

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

const executer = docker.findContainer();
await executer.execute();

// const id = await docker.tryReadID('-u');
// console.log('id', id);
