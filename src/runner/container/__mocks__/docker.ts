import DockerContainer from '../docker';

const Mocked = vi.fn(function () {
  return new DockerContainer({
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
});

Object.assign(Mocked, {
  docker: DockerContainer.docker,
  Setup: DockerContainer.Setup,
});

export default Mocked;
