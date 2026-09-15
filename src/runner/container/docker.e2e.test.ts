import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import * as tar from 'tar';

import { createAllDir, dockerAvailable } from '@/test/__helpers__';

import DockerContainer, { type DockerContainerOptions } from './docker';

/**
 * 需要本机 Docker daemon 的集成测试。
 *
 * 没有 daemon 时整个 describe 跳过而不是失败，`bunx vitest run` 因此在没装
 * docker 的机器上依然全绿。这里只验证必须真起容器才能确认的行为——文件真的被
 * 搬进/搬出了容器。argv、env、退出码映射这类「请求长什么样」的断言交给
 * docker.test.ts 的假传输覆盖。
 */

const workdir = '/home/runner';
const tmp = createAllDir('docker-e2e');
// 软链与硬链单独放一个目录。tar 会按 inode 去重，把其中一个写成 Link 条目，混进
// files 里会让归档往返用例的 File 条目列表变成依赖 daemon 遍历顺序的东西。
const linkTmp = createAllDir('docker-e2e-links');

const files = [
  { name: 'test1.txt', body: 'test1 content' },
  { name: 'test2.txt', body: 'test2 content' },
];

const link = {
  body: 'link content',
  name: 'test1.txt',
  symlinkName: 'symlink-test1.txt',
  hardlinkName: 'link-test1.txt',
};

describe.skipIf(!dockerAvailable())('DockerContainer end to end', () => {
  vi.setConfig({ testTimeout: 60000 });

  const container = new DockerContainer({
    name: `docker-e2e-${randomBytes(4).toString('hex')}`,
    image: 'node:lts-slim',
    entrypoint: ['tail', '-f', '/dev/null'],
    workdir,
    cmd: [],
    env: { LANG: 'C.UTF-8' },
    autoRemove: true,
  } satisfies DockerContainerOptions);

  beforeAll(() => {
    for (const file of files) {
      fs.writeFileSync(path.join(tmp, file.name), file.body);
    }

    fs.writeFileSync(path.join(linkTmp, link.name), link.body);
    fs.symlinkSync(link.name, path.join(linkTmp, link.symlinkName));
    fs.linkSync(path.join(linkTmp, link.name), path.join(linkTmp, link.hardlinkName));
  });

  afterAll(async () => {
    await container.remove().execute();
  });

  it('pulls, creates and starts the container', async () => {
    await container.start().execute();

    expect(container.container?.id).toBeTruthy();
  });

  it('copies a file in', async () => {
    await container.put('put-file-test', path.join(tmp, files[0].name)).execute();

    const fileEntry = await container.getContent('put-file-test/test1.txt');
    expect(fileEntry?.body).toBe(files[0].body);
  });

  it('copies a directory in', async () => {
    await container.put('put-dir-test', tmp).execute();

    const fileEntry = await container.getContent('put-dir-test/test2.txt');
    expect(fileEntry?.body).toBe(files[1].body);
  });

  it('writes content in', async () => {
    await container.putContent('put-content-test', ...files).execute();

    const fileEntry = await container.getContent('put-content-test/test1.txt');
    expect(fileEntry?.body).toBe(files[0].body);
  });

  it('writes content to an absolute directory', async () => {
    const destination = '/put-content-absolute-test';

    await container.putContent(destination, ...files).execute();

    const fileEntry = await container.getContent(path.join(destination, files[0].name));
    expect(fileEntry?.body).toBe(files[0].body);
  });

  it('reads a file through a symbolic link', async () => {
    await container.put('put-link-test', linkTmp).execute();

    const fileEntry = await container.getContent(`put-link-test/${link.symlinkName}`);
    expect(fileEntry?.body).toBe(link.body);
  });

  it('reads a file through a hard link', async () => {
    await container.put('put-link-test', linkTmp).execute();

    const fileEntry = await container.getContent(`put-link-test/${link.hardlinkName}`);
    expect(fileEntry?.body).toBe(link.body);
  });

  it('reports nothing for a file that is not there', async () => {
    await expect(container.getContent('put-content-test/no-such-file')).resolves.toBeUndefined();
  });

  it('round trips an archive', async () => {
    const archive = tar.create({ cwd: tmp, portable: true }, ['.']) as unknown as NodeJS.ReadableStream;
    await container.putArchive('put-archive-test', archive).execute();

    const extract = tar.t({});
    (await container.getArchive('put-archive-test')).pipe(extract);

    const names: string[] = [];
    extract.on('entry', (entry: tar.ReadEntry) => {
      if (entry.type === 'File') {
        names.push(path.basename(entry.path));
      }
    });
    await new Promise<void>((resolve) => {
      extract.on('finish', () => {
        resolve();
      });
    });

    expect(names.toSorted()).toEqual(files.map((file) => file.name).toSorted());
  });

  it('runs a script inside the container', async () => {
    const body = fs.readFileSync(path.join(__dirname, '__mocks__/print_message.sh'), 'utf8');
    await container.putContent('', { name: 'print_message.sh', mode: 0o777, body }).execute();

    await expect(container.exec(['./print_message.sh']).execute()).resolves.toBeUndefined();
  });

  it('rejects an exec that exits non-zero', async () => {
    // `exit 3` rather than a missing binary: the code the runtime reports for the
    // latter is daemon-specific (126 on docker 20.10, 127 on others).
    await expect(container.exec(['sh', '-c', 'exit 3']).execute()).rejects.toThrow(/exit code 3/);
  });

  it('spawns a command through the docker CLI', () => {
    const { stdout } = container.spawnSync('printenv', ['sobird'], { env: { sobird: 'sobird' } });

    expect(stdout.trim()).toBe('sobird');
  });

  it('hashes the files matching a pattern', async () => {
    await container.putContent('', { name: 'package.json', mode: 0o644, body: '{"name": "test"}' }).execute();

    expect(container.hashFiles('package.json')).toHaveLength(64);
    expect(container.hashFiles('--follow-symbolic-links', 'package.json')).toHaveLength(64);
  });

  it('reads name/value pairs out of an env file', async () => {
    await container
      .putContent('.', { name: 'env', mode: 0o644, body: ['name=sobird', 'hello=world'].join('\n') })
      .execute();

    await expect(container.getFileEnv('env')).resolves.toEqual({ name: 'sobird', hello: 'world' });
  });

  it('visits every non-empty line of a file', async () => {
    await container.putContent('readline-test', { name: 'lines.txt', mode: 0o644, body: 'hello\n\nworld\n' }).execute();

    const lines: string[] = [];
    await container.readline('readline-test/lines.txt', (line) => {
      lines.push(line);
    });

    expect(lines).toEqual(['hello', 'world']);
  });

  it('takes an absolute path as-is when it is executable', () => {
    expect(container.lookPath('/bin/bash', { PATH: process.env.PATH })).toBe('/bin/bash');
  });

  it('finds an executable on the path', () => {
    expect(container.lookPath('bash', { PATH: process.env.PATH })).toBe('/bin/bash');
  });
});
