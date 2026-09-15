import cp, { type SpawnSyncReturns } from 'node:child_process';
import { PassThrough } from 'node:stream';

import type Dockerode from 'dockerode';

import docker from '@/docker';

import DockerContainer, { type DockerContainerOptions } from './docker';

const workspace = '/home/runner';

const options: DockerContainerOptions = {
  name: 'test-container',
  image: 'node:lts-slim',
  workdir: workspace,
  env: { LANG: 'C.UTF-8' },
  autoRemove: true,
};

/**
 * DockerContainer 的单测：daemon 与 docker CLI 全被替换，只断言它构造出的东西。
 *
 * 这里验证的是「请求长什么样」——argv 的顺序、env 的拼装、退出码到异常的映射——
 * 真起容器反而测不到这些（漏传一个 env 不会让容器跑失败）。真 daemon 的集成
 * 覆盖在 docker.e2e.test.ts。
 */

/** 一个已经挂上假 dockerode handle 的容器。 */
function createContainer() {
  const container = new DockerContainer(options);
  container.container = { id: 'abc123' } as unknown as Dockerode.Container;
  return container;
}

/** 假的 `container.exec()`，返回一个下一个宏任务就结束的流。 */
function fakeExec(ExitCode: number) {
  const stream = new PassThrough();
  setImmediate(() => stream.end());

  return {
    start: vi.fn(async () => stream),
    inspect: vi.fn(async () => ({ ExitCode })),
  };
}

function spawnReport(stderr: string) {
  return vi.spyOn(cp, 'spawnSync').mockReturnValue({ stderr } as unknown as SpawnSyncReturns<string>);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('spawnSync', () => {
  it('builds a docker exec argv from the exec options', () => {
    const spawn = vi.spyOn(cp, 'spawnSync').mockReturnValue({} as SpawnSyncReturns<string>);

    createContainer().spawnSync('printenv', ['AMBIENT'], {
      cwd: '/w',
      env: { A: '1' },
      privileged: true,
      user: 'root',
    });

    expect(spawn).toHaveBeenCalledWith(
      'docker',
      ['exec', '-e', 'A=1', '-w', '/w', '--privileged', '-u', 'root', 'abc123', 'printenv', 'AMBIENT'],
      { encoding: 'utf8' },
    );
  });

  it('omits the flags the caller did not set', () => {
    const spawn = vi.spyOn(cp, 'spawnSync').mockReturnValue({} as SpawnSyncReturns<string>);

    createContainer().spawnSync('true', []);

    expect(spawn.mock.calls[0][1]).toEqual(['exec', 'abc123', 'true']);
  });
});

describe('hashFiles', () => {
  const hash = 'b'.repeat(64);
  const script = `${workspace}/bin/hashFiles/index.js`;

  it('returns the hash the script reports on stderr', () => {
    const spawn = spawnReport(`__OUTPUT__${hash}__OUTPUT__`);

    expect(createContainer().hashFiles('**/package.json')).toBe(hash);

    expect(spawn).toHaveBeenCalledWith(
      'docker',
      ['exec', '-e', 'patterns=**/package.json', '-w', workspace, 'abc123', 'node', script],
      { encoding: 'utf8' },
    );
  });

  it('returns an empty string when nothing matched', () => {
    spawnReport('__OUTPUT____OUTPUT__');

    expect(createContainer().hashFiles('**/package.json')).toBe('');
  });

  it('passes the follow-symbolic-links flag through to the script', () => {
    const spawn = spawnReport(`__OUTPUT__${hash}__OUTPUT__`);

    expect(createContainer().hashFiles('--follow-symbolic-links', '**/package.json')).toBe(hash);

    expect(spawn).toHaveBeenCalledWith(
      'docker',
      [
        'exec',
        '-e',
        'patterns=**/package.json',
        '-e',
        'followSymbolicLinks=true',
        '-w',
        workspace,
        'abc123',
        'node',
        script,
      ],
      { encoding: 'utf8' },
    );
  });
});

describe('exec', () => {
  it('resolves once the process exits with code 0', async () => {
    const container = createContainer();
    const exec = fakeExec(0);
    const start = vi.fn(async () => exec);
    (container.container as unknown as { exec: unknown }).exec = start;

    await expect(container.exec(['true'], { cwd: 'work', env: { A: '1' } }).execute()).resolves.toBeUndefined();

    expect(start).toHaveBeenCalledWith({
      WorkingDir: `${workspace}/work`,
      Cmd: ['true'],
      Env: ['A=1'],
      User: undefined,
      AttachStdout: true,
      AttachStderr: true,
    });
    expect(exec.inspect).toHaveBeenCalled();
  });

  it('rejects when the process exits with a non-zero code', async () => {
    const container = createContainer();
    (container.container as unknown as { exec: unknown }).exec = vi.fn(async () => fakeExec(127));

    await expect(container.exec(['definitely-not-a-command']).execute()).rejects.toThrow(
      'Process completed with exit code 127.',
    );
  });
});

describe('daemon introspection', () => {
  it('reads the platform off the daemon', async () => {
    vi.spyOn(docker, 'info').mockResolvedValue({ OSType: 'linux', Architecture: 'x86_64' } as never);

    const container = createContainer();
    await container.info().execute();

    expect(container.OS).toBe('Linux');
    expect(container.Arch).toBe('X64');
  });

  it('parses the env of the image config', async () => {
    vi.spyOn(docker, 'getImage').mockReturnValue({
      inspect: async () => ({ Config: { Env: ['LANG=C.UTF-8', 'PATH=/usr/bin'] } }),
    } as never);

    const env = await createContainer().imageEnv();

    expect(docker.getImage).toHaveBeenCalledWith('node:lts-slim');
    expect(env).toEqual({ LANG: 'C.UTF-8', PATH: '/usr/bin' });
  });

  it('maps the inspected network settings to an id, network and port map', async () => {
    const container = createContainer();
    (container.container as unknown as { inspect: unknown }).inspect = vi.fn(async () => ({
      NetworkSettings: {
        Ports: {
          '80/tcp': [{ HostIp: '0.0.0.0', HostPort: '8080' }],
          '443/tcp': [{ HostIp: '0.0.0.0', HostPort: '8443' }],
        },
        Networks: { bridge: { NetworkID: 'net' } },
      },
    }));

    await expect(container.context()).resolves.toEqual({
      id: 'abc123',
      network: 'bridge',
      ports: { 80: '8080', 443: '8443' },
    });
  });

  it('reports an empty context when there is no container', async () => {
    await expect(new DockerContainer(options).context()).resolves.toEqual({ id: '', network: '', ports: {} });
  });

  it('skips following the pull progress when the daemon returns no stream', async () => {
    const pull = vi.spyOn(docker, 'pullImage').mockResolvedValue(undefined as never);

    await new DockerContainer({ ...options, pull: true }).pullImage().execute();

    expect(pull).toHaveBeenCalledWith('node:lts-slim', {
      force: true,
      platform: undefined,
      authconfig: undefined,
    });
  });
});

describe('create', () => {
  it('reuses the running container whose name matches', async () => {
    const container = new DockerContainer(options);
    const getContainer = vi.spyOn(docker, 'getContainer').mockReturnValue({
      id: 'found',
    } as unknown as Dockerode.Container);
    vi.spyOn(docker, 'listContainers').mockResolvedValue([{ Id: 'found', Names: ['/test-container'] }] as never);
    const create = vi.spyOn(docker, 'createContainer').mockResolvedValue({ id: 'created' } as never);

    await container.create().execute();

    expect(getContainer).toHaveBeenCalledWith('found');
    expect(container.container?.id).toBe('found');
    expect(create).not.toHaveBeenCalled();
  });

  it('creates a container when none is running', async () => {
    const container = new DockerContainer(options);
    vi.spyOn(docker, 'listContainers').mockResolvedValue([]);
    const create = vi.spyOn(docker, 'createContainer').mockResolvedValue({ id: 'created' } as never);

    await container.create().execute();

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'test-container',
        Image: 'node:lts-slim',
        Env: ['LANG=C.UTF-8'],
        WorkingDir: workspace,
        Tty: false,
        HostConfig: expect.objectContaining({ AutoRemove: true, Privileged: false }),
      }),
    );
    expect(container.container?.id).toBe('created');
  });
});

describe.runIf(process.platform !== 'win32')('resolve', () => {
  it.each([
    ['/home/act/go/src/github.com/nektos/act', '/home/act/go/src/github.com/nektos/act'],
    ['/home/act', '/home/act/'],
    [workspace, '.'],
    [`${workspace}/test`, 'test'],
    // A windows style path is normalized to its wsl form before being resolved.
    ['/mnt/c/Project', 'C:\\Project'],
  ])('resolves %s', (destination, source) => {
    expect(createContainer().resolve(source)).toBe(destination);
  });
});

describe.runIf(process.platform === 'win32')('resolve', () => {
  it.each([
    ['/mnt/c/Users/act/go/src/github.com/nektos/act', 'C:\\Users\\act\\go\\src\\github.com\\nektos\\act\\'],
    ['/mnt/f/work/dir', 'F:\\work\\dir'],
    [`${workspace}/windows/to/unix`, 'windows\\to\\unix'],
    [`${workspace}/act`, 'act'],
  ])('resolves %s', (destination, source) => {
    expect(createContainer().resolve(source)).toBe(destination);
  });
});
