import { type SpawnSyncReturns } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import * as tar from 'tar';

import { WellKnownDirectory } from '@/common/constants';
import Executor from '@/common/executor';

import Container, { type ContainerExecOptions } from './container';

const workdir = '/home/runner';

/**
 * 只实现抽象成员的最小容器。
 *
 * 归档来自磁盘上的夹具目录、子进程调用被替换成假实现，所以基类里 getContent /
 * getFileEnv / readline / hashFiles 这些逻辑可以脱离 Docker daemon 单独验证。
 * 真实实现的行为分别由 docker.test.ts（假传输）与 docker.e2e.test.ts（真 daemon）覆盖。
 */
class FakeContainer extends Container {
  OS = 'Linux';

  Arch = 'X64';

  Environment = 'github-hosted';

  constructor(private dir: string) {
    super({ workdir }, workdir);
  }

  async getArchive(filename: string) {
    if (!fs.existsSync(path.join(this.dir, filename))) {
      throw new Error(`no such file: ${filename}`);
    }
    return tar.create({ cwd: this.dir, portable: true }, [filename]) as unknown as NodeJS.ReadableStream;
  }

  put() {
    return new Executor(() => {});
  }

  putContent() {
    return new Executor(() => {});
  }

  putArchive() {
    return new Executor(() => {});
  }

  start() {
    return new Executor(() => {});
  }

  remove() {
    return new Executor(() => {});
  }

  pullImage() {
    return new Executor(() => {});
  }

  exec() {
    return new Executor(() => {});
  }

  spawnSync(_command: string, _args: string[], _options: ContainerExecOptions) {
    return {} as unknown as SpawnSyncReturns<string>;
  }

  async imageEnv() {
    return {};
  }

  resolve(...paths: string[]) {
    return path.posix.resolve(this.workspace, ...paths);
  }

  async context() {
    return { id: '', network: '', ports: {} };
  }
}

const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'container-unit-'));
const container = new FakeContainer(fixtureDir);

const envFiles: Record<string, string> = {
  'env-normal.txt': 'name=sobird\nhello=world',
  'env-equals.txt': 'A=b=c',
  'env-heredoc.txt': 'NAME<<EOF\nline1\nline2\nEOF',
  'env-unterminated.txt': 'NAME<<EOF\nline1',
  'env-bad-heredoc.txt': '<<EOF',
};

beforeAll(() => {
  fs.writeFileSync(path.join(fixtureDir, 'file.txt'), 'hello world');
  fs.writeFileSync(path.join(fixtureDir, 'empty.txt'), '');
  fs.symlinkSync('file.txt', path.join(fixtureDir, 'symlink.txt'));
  fs.writeFileSync(path.join(fixtureDir, 'lines.txt'), 'hello\n\nworld\n');
  for (const [name, body] of Object.entries(envFiles)) {
    fs.writeFileSync(path.join(fixtureDir, name), body);
  }
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(() => {
  fs.rmSync(fixtureDir, { recursive: true, force: true });
});

describe('hashFiles', () => {
  const hash = 'a'.repeat(64);

  function spawnReport(stderr: string) {
    return vi.spyOn(container, 'spawnSync').mockReturnValue({ stderr } as unknown as SpawnSyncReturns<string>);
  }

  it('returns the hash the script reports on stderr', () => {
    const spawn = spawnReport(`__OUTPUT__${hash}__OUTPUT__`);

    expect(container.hashFiles('**/package.json')).toBe(hash);

    const [command, args, options] = spawn.mock.calls[0];
    expect(command).toBe('node');
    expect(args).toEqual([container.resolve(WellKnownDirectory.Bin, 'hashFiles', 'index.js')]);
    expect(options).toEqual({ env: { patterns: '**/package.json' }, cwd: workdir });
  });

  it('returns an empty string when nothing matched', () => {
    spawnReport('__OUTPUT____OUTPUT__');

    expect(container.hashFiles('**/package.json')).toBe('');
  });

  it('asks the script to follow symbolic links only when told to', () => {
    const spawn = spawnReport(`__OUTPUT__${hash}__OUTPUT__`);

    container.hashFiles('--follow-symbolic-links', '**/package.json');

    expect(spawn.mock.calls[0][2].env).toEqual({
      patterns: '**/package.json',
      followSymbolicLinks: 'true',
    });
  });
});

describe('getContent', () => {
  it('reads a file out of the archive', async () => {
    await expect(container.getContent('file.txt')).resolves.toMatchObject({
      name: 'file.txt',
      body: 'hello world',
      size: 'hello world'.length,
    });
  });

  it('reads an empty file without waiting for data', async () => {
    await expect(container.getContent('empty.txt')).resolves.toMatchObject({ body: '', size: 0 });
  });

  it('follows a symbolic link to the file it points at', async () => {
    await expect(container.getContent('symlink.txt')).resolves.toMatchObject({ body: 'hello world' });
  });

  it('gives up when the archive cannot be read', async () => {
    await expect(container.getContent('missing.txt')).resolves.toBeUndefined();
  });
});

describe('readJSON', () => {
  it('parses a json body', async () => {
    fs.writeFileSync(path.join(fixtureDir, 'package.json'), '{"name":"test"}');

    await expect(container.readJSON('package.json')).resolves.toEqual({ name: 'test' });
  });

  it('yields an empty object when the file is absent', async () => {
    await expect(container.readJSON('missing.json')).resolves.toEqual({});
  });
});

describe('readline', () => {
  it('visits every non-empty line once', async () => {
    const lines: string[] = [];

    await container.readline('lines.txt', (line) => {
      lines.push(line);
    });

    expect(lines).toEqual(['hello', 'world']);
  });
});

describe('getFileEnv', () => {
  it('reads NAME=VALUE pairs', async () => {
    await expect(container.getFileEnv('env-normal.txt')).resolves.toEqual({ name: 'sobird', hello: 'world' });
  });

  it('keeps the rest of the value when it contains an equals sign', async () => {
    await expect(container.getFileEnv('env-equals.txt')).resolves.toEqual({ A: 'b=c' });
  });

  it('reads heredoc values up to their delimiter', async () => {
    await expect(container.getFileEnv('env-heredoc.txt')).resolves.toEqual({
      NAME: ['line1', 'line2'].join(os.EOL),
    });
  });

  it('rejects a heredoc whose delimiter never arrives', async () => {
    await expect(container.getFileEnv('env-unterminated.txt')).rejects.toThrow(/Matching delimiter not found/);
  });

  it('rejects a heredoc without a name', async () => {
    await expect(container.getFileEnv('env-bad-heredoc.txt')).rejects.toThrow(/Invalid format/);
  });
});

describe('paths and directories', () => {
  it('resolves paths against the workspace', () => {
    expect(container.resolve('test')).toBe('/home/runner/test');
    expect(container.directory('Tool')).toBe(`/home/runner/${WellKnownDirectory.Tool}`);
    expect(container.directory('Temp')).toBe(`/home/runner/${WellKnownDirectory.Temp}`);
  });

  it('strips the root directory when asked for a container path', () => {
    const rooted = new FakeContainer(fixtureDir);
    rooted.rootdir = workdir;

    expect(rooted.Resolve(`${workdir}/work/tool`)).toBe('/work/tool');
  });

  it('reports the well known paths of the runner', () => {
    expect(container.Env).toMatchObject({
      RUNNER_OS: 'Linux',
      RUNNER_ARCH: 'X64',
      RUNNER_TOOL_CACHE: `${workdir}/${WellKnownDirectory.Tool}`,
      RUNNER_TEMP: `${workdir}/${WellKnownDirectory.Temp}`,
    });
  });
});

describe('path helpers', () => {
  it('joins and splits on the posix separator', () => {
    expect(container.joinPath('/usr/local/bin', '/bin')).toBe('/usr/local/bin:/bin');
    expect(container.splitPath('/usr/local/bin:/bin')).toEqual(['/usr/local/bin', '/bin']);
    expect(container.pathVariableName).toBe('PATH');
    expect(container.isCaseSensitive).toBe(true);
  });

  it('uses the windows separator and variable name on windows', () => {
    const windows = new FakeContainer(fixtureDir);
    windows.OS = 'Windows';

    expect(windows.joinPath('C:\\bin', 'C:\\other')).toBe('C:\\bin;C:\\other');
    expect(windows.pathVariableName).toBe('Path');
    expect(windows.isCaseSensitive).toBe(false);
  });

  it('takes an absolute path as-is when it is executable', () => {
    expect(container.lookPath(process.execPath, {})).toBe(process.execPath);
  });

  it('finds an executable on the path', () => {
    const found = container.lookPath(path.basename(process.execPath), { PATH: path.dirname(process.execPath) });

    expect(found).toBe(process.execPath);
  });

  it('reports an empty string when nothing matches', () => {
    expect(container.lookPath('definitely-not-on-path-12345', { PATH: path.dirname(process.execPath) })).toBe('');
  });
});

describe('static helpers', () => {
  it.each([
    ['/var/log/app', '/var/log/app'],
    ['docs', 'docs'],
    ['/mnt/c/Project', '/mnt/c/Project'],
    ['\\mnt/c\\Project', '/mnt/c/Project'],
    ['C:\\Project', '/mnt/c/Project'],
    ['C:/Project\\test', '/mnt/c/Project/test'],
    ['C:\\Project\\src', '/mnt/c/Project/src'],
    ['D:/Data/2024', '/mnt/d/Data/2024'],
    ['C:/Project\\mixed/path', '/mnt/c/Project/mixed/path'],
    ['E:\\AppData', '/mnt/e/AppData'],
    ['C:\\Project\\src\\..', '/mnt/c/Project'],
    ['C:\\', '/mnt/c/'],
    ['C:\\Program Files', '/mnt/c/Program Files'],
    ['D:\\测试目录\\文件@2024', '/mnt/d/测试目录/文件@2024'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(Container.Normalize(input)).toBe(expected);
  });

  describe.runIf(process.platform === 'win32')('windows path quirks', () => {
    // win32 的 path.normalize 会补上 UNC 路径的结尾反斜杠，posix 不会；两者把
    // 反斜杠换成正斜杠后正好差一个结尾斜杠。
    it('keeps the trailing separator of a UNC path', () => {
      expect(Container.Normalize('\\\\server\\share')).toBe('//server/share/');
    });
  });

  it('maps platform and architecture names', () => {
    expect(Container.OS('linux')).toBe('Linux');
    expect(Container.OS('darwin')).toBe('macOS');
    expect(Container.OS('plan9')).toBeUndefined();
    expect(Container.Arch('x64')).toBe('X64');
    expect(Container.Arch('aarch64')).toBe('ARM64');
  });

  it('tells files and directories apart when checking executability', () => {
    expect(Container.isExecutable(process.execPath)).toBe(true);
    expect(Container.isExecutable(fixtureDir)).toBe(false);
    expect(Container.isExecutable(path.join(fixtureDir, 'no-such-file'))).toBe(false);
  });

  it('reads an environment variable by name', () => {
    expect(Container.GetEnv({ PATH: '/usr/bin' }, 'PATH')).toBe('/usr/bin');
    expect(Container.GetEnv({}, 'PATH')).toBe('');
  });

  it('joins a symlink target under the parent directory', () => {
    expect(Container.SymlinkJoin('dir/file.txt', 'other.txt', '.')).toBe('dir/other.txt');
    expect(Container.SymlinkJoin('dir/file.txt', 'sub/up.txt', 'dir')).toBe('dir/sub/up.txt');
  });

  it('refuses a symlink that escapes the parent directory', () => {
    expect(() => Container.SymlinkJoin('dir/file.txt', '../../etc/passwd', 'dir')).toThrow(/outside of/);
  });
});
