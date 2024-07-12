import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import * as tar from 'tar';

import Docker from './docker';

vi.mock('./docker');

const docker = new Docker();

const tmp = path.join(os.tmpdir(), `container-docker-${randomBytes(8).toString('hex')}`);
const files = [{
  name: 'test1.txt',
  body: 'test1 content',
}, {
  name: 'test2.txt',
  body: 'test2 content',
}];
beforeAll(() => {
  fs.mkdirSync(tmp, { recursive: true });

  for (const file of files) {
    fs.writeFileSync(path.join(tmp, file.name), file.body);
  }
});

afterAll(async () => {
  fs.rmdirSync(tmp, { recursive: true });
  // const removeExecutor = docker.remove();
  // await removeExecutor.execute();
});

vi.setConfig({
  testTimeout: 60000,
});

describe('test Docker Container', () => {
  it('docker pull image test case', async () => {
    const executor = docker.pull();
    await executor.execute();
    // expect(docker.container).not.toBeUndefined();
  });

  it('docker create container test case', async () => {
    const executor = docker.create();
    await executor.execute();
    const id = docker.container?.id;
    expect(id).not.toBeUndefined();
  });

  it('docker start container test case', async () => {
    const executor = docker.start();
    await executor.execute();

    const id = docker.container?.id;
    expect(id).not.toBeUndefined();
  });

  it('docker put file to container test case', async () => {
    const executor = docker.put('put-file-test', path.join(tmp, files[0].name));
    await executor.execute();
  });

  it('docker put dir to container test case', async () => {
    const executor = docker.put('put-dir-test', tmp);
    await executor.execute();
  });

  it('docker put content to container test case', async () => {
    const executor = docker.putContent('put-content-test', ...files);
    await executor.execute();
  });

  it('put archive to container test case', async () => {
    const archive = tar.create({ cwd: tmp, portable: true }, ['.']) as unknown as NodeJS.ReadableStream;
    await docker.putArchive('put-archive-test', archive);
  });

  it('get archive from container test case', async () => {
    const archive = await docker.getArchive('put-archive-test');

    const extract = tar.t({ });
    archive.pipe(extract);

    const archiveFiles: any = [];
    extract.on('entry', (entry) => {
      let body = '';
      entry.on('data', (chunk: Buffer) => {
        body += chunk;
      });
      entry.on('end', () => {
        if (entry.type === 'File') {
          archiveFiles.push({
            name: path.basename(entry.path),
            body,
          });
        }
      });
    });

    await new Promise((resolve) => {
      extract.on('finish', () => {
        resolve('');
      });
    });

    expect(archiveFiles).toEqual(files);
  });

  it('container exec test case', async () => {
    const body = fs.readFileSync(path.join(__dirname, '__mocks__/print_message.sh'), 'utf8');
    const putContentExecutor = docker.putContent('', {
      name: 'print_message.sh',
      mode: 0o777,
      body,
    });
    await putContentExecutor.execute();

    const execExecutor = docker.exec(['./print_message.sh']);
    await execExecutor.execute();
  });

  it('container spawnSync printenv test case', async () => {
    const { stdout } = docker.spawnSync('printenv', ['spawnSync'], { env: { spawnSync: 'sobird' } });

    expect(stdout).toBe(`sobird${os.EOL}`);
  });

  it('container hashFiles test case', async () => {
    const putContentExecutor = docker.putContent('', {
      name: 'package.json',
      mode: 0o777,
      body: 'test content',
    });
    await putContentExecutor.execute();

    const hash = docker.hashFiles('package.json');

    expect(hash.length).toBe(64);
  });

  it('container hashFiles with --follow-symbolic-links test case', async () => {
    const hash = docker.hashFiles('--follow-symbolic-links', 'package.json');
    expect(hash.length).toBe(64);
  });

  it('container parseEnvFile test case', async () => {
    const putContentExecutor = docker.putContent('', {
      name: 'env',
      mode: 0o777,
      body: `
      name=sobird
      hello=world
      `,
    });
    await putContentExecutor.execute();

    const envObj = await docker.parseEnvFile('env');

    const dd = await Docker.docker.version();
    console.log('dd', dd);

    expect(envObj).toEqual({
      name: 'sobird',
      hello: 'world',
    });
  });
});
