import Docker from '../docker';

const docker = new Docker({
  name: 'node-lts-slim',
  image: 'node:lts-slim',
  entrypoint: ['/bin/sleep', '3600'],
  workdir: '/home/runner',
  cmd: [],
  env: {
    RUNNER_TOOL_CACHE: '/opt/hostedtoolcache',
    RUNNER_OS: 'Linux',
    RUNNER_TEMP: '/tmp',
    LANG: 'C.UTF-8',
  },
  autoRemove: true,
  privileged: true,
  usernsMode: '',
  portBindings: {},
  exposedPorts: {},
});

const mockDocker = vi.fn().mockImplementation(() => {
  return docker;
});

export default mockDocker;
