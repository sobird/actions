import DockerContainer from '../docker';

const dockerContainer = new DockerContainer({
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
  platform: '',
});

const fn = vi.fn();
(fn as any).docker = DockerContainer.docker;
(fn as any).Setup = DockerContainer.Setup;
(fn as any).Resolve = DockerContainer.Resolve;
const Mocker = fn.mockImplementation(() => {
  return dockerContainer;
});

export default Mocker;
