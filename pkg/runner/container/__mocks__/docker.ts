import { ContainerCreateOptions } from 'dockerode';

import Docker from '../docker';

const Env = [
  'RUNNER_TOOL_CACHE=/opt/hostedtoolcache',
  'RUNNER_OS=Linux',
  'RUNNER_ARCH=',
  'RUNNER_TEMP=/tmp',
  'LANG=C.UTF-8',
];

const containerCreateOptions: ContainerCreateOptions = {
  Cmd: [],
  Entrypoint: ['/bin/sleep', '3600'],
  WorkingDir: '/home/runner',
  Image: 'node:lts-slim',
  name: 'node-lts-slim',
  Env,
  HostConfig: {
    AutoRemove: true,
    Privileged: true,
    UsernsMode: '',
    PortBindings: {},
  },
  platform: '',

  ExposedPorts: {},

  // StopTimeout: 30,
};

const docker = new (Docker as any)(containerCreateOptions);

const mockDocker = vi.fn().mockImplementation(() => {
  return docker;
});

export default mockDocker;
