import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import * as tar from 'tar';

import DockerContainer from './docker';

vi.mock('./docker');

const workdir = '/home/runner';
const docker: DockerContainer = new (DockerContainer as any)();
docker.options.workdir = workdir;

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

describe('Test Docker Container', () => {
  it('pull image', async () => {
    const executor = docker.pullImage();
    await executor.execute();
    // expect(docker.container).not.toBeUndefined();
  });

  it('create container', async () => {
    const executor = docker.create();
    await executor.execute();
    const id = docker.container?.id;
    expect(id).not.toBeUndefined();
  });

  it('start container', async () => {
    const executor = docker.start();
    await executor.execute();

    const id = docker.container?.id;
    expect(id).not.toBeUndefined();
  });

  it('put file to container', async () => {
    const executor = docker.put('put-file-test', path.join(tmp, files[0].name));
    await executor.execute();
  });

  it('put dir to container', async () => {
    const executor = docker.put('put-dir-test', tmp);
    await executor.execute();
  });

  it('put content to container', async () => {
    const executor = docker.putContent('put-content-test', ...files);
    await executor.execute();
  });

  it('get content from container', async () => {
    const { body } = await docker.getContent('put-content-test/test1.txt');
    expect(body).toBe('test1 content');
  });

  it('put archive to container', async () => {
    const archive = tar.create({ cwd: tmp, portable: true }, ['.']) as unknown as NodeJS.ReadableStream;
    await docker.putArchive('put-archive-test', archive);
  });

  it('get archive from container', async () => {
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

  it('container exec', async () => {
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
    const { stdout } = docker.spawnSync('printenv', ['sobird'], { env: { sobird: 'sobird' } });

    expect(stdout.trim()).toBe('sobird');
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

  it('container getFileEnv test case', async () => {
    const putContentExecutor = docker.putContent('.', {
      name: 'env',
      mode: 0o777,
      body: ['name=sobird', 'hello=world'].join('\n'),
    });
    await putContentExecutor.execute();

    const envObj = await docker.getFileEnv('env');

    expect(envObj).toEqual({
      name: 'sobird',
      hello: 'world',
    });
  });
});

describe('test docker container path', () => {
  if (process.platform === 'win32') {
    const testCases = [
      ['/mnt/c/Users/act/go/src/github.com/nektos/act', 'C:\\Users\\act\\go\\src\\github.com\\nektos\\act\\'],
      ['/mnt/f/work/dir', 'F:\\work\\dir'],
      [`${workdir}/windows/to/unix`, 'windows\\to\\unix'],
      [`${workdir}/act`, 'act'],
    ];

    testCases.forEach((item) => {
      const [destination, source] = item;
      it(source, () => {
        expect(docker.resolve(source)).toBe(destination);
      });
    });
  } else {
    const testCases = [
      ['/home/act/go/src/github.com/nektos/act', '/home/act/go/src/github.com/nektos/act'],
      ['/home/act', '/home/act/'],
      [workdir, '.'],
      [`${workdir}/test`, 'test'],
    ];

    testCases.forEach((item) => {
      const [destination, source] = item;
      it(source, () => {
        expect(docker.resolve(source)).toBe(destination);
      });
    });
  }
});
