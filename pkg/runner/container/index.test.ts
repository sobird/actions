import fs from 'node:fs';
import path from 'node:path';

import * as tar from 'tar';

import { listEntry } from '@/utils/tar';
import { createAllDir } from '@/utils/test';

import DockerContainer from './docker';
import HostedContainer from './hosted';

vi.mock('./hosted');
vi.mock('./docker');

const workdir = '/home/runner';
const hosted: HostedContainer = new (HostedContainer as any)();
const docker: DockerContainer = new (DockerContainer as any)();
docker.options.workdir = workdir;

const filedir = createAllDir('hosted-test', 'file');

const files = [
  {
    name: 'test1.txt',
    linkName: 'link-test1.txt',
    symlinkName: 'symlink-test1.txt',
    // mode: 0o700,
    body: 'test1 content',
  },
  {
    name: 'test2.txt',
    linkName: 'link-test2.txt',
    symlinkName: 'symlink-test2.txt',
    // mode: 0o700,
    body: 'test2 content',
  },
];

beforeAll(() => {
  for (const file of files) {
    const fileName = path.join(filedir, file.name);
    fs.writeFileSync(fileName, file.body);
    fs.symlinkSync(file.name, path.join(filedir, file.symlinkName));
    fs.linkSync(fileName, path.join(filedir, file.linkName));
  }
});

describe.each([hosted, docker])('Test $constructor.name', (container) => {
  afterAll(async () => {
    const removeExecutor = container.remove();
    await removeExecutor.execute();
  });

  describe('Container Public Methods', () => {
    it('start container', async () => {
      const executor = container.start();
      await expect(executor.execute()).resolves.toBeUndefined();
    });

    it('put file to container', async () => {
      const destination = 'put-file-test';
      const file = files[0];
      const sourceFile = path.join(filedir, file.name);

      const executor = container.put(destination, sourceFile);
      await executor.execute();

      const fileEntry = await container.getContent(path.join(destination, file.name));
      expect(fileEntry?.body).toEqual(file.body);
    });

    it('put dir to container', async () => {
      const destination = 'put-dir-test';

      const executor = container.put(destination, filedir);
      await executor.execute();

      const archive = await container.getArchive(destination);
      const fileFiles = await listEntry(archive);
      const sourceFiles = fs.readdirSync(filedir);

      expect(fileFiles?.map((item) => {
        return path.basename(item);
      })).toEqual(sourceFiles);
    });

    it('put content to container relative directory', async () => {
      const destination = 'put-content-relative-test';

      const executor = container.putContent(destination, ...files);
      await executor.execute();

      const archive = await container.getArchive(destination);
      const fileFiles = await listEntry(archive);

      expect(fileFiles?.map((item) => {
        return path.basename(item);
      })).toEqual(files.map((item) => { return item.name; }));
    });

    it('put content to container absolute directory', async () => {
      const destination = '/put-content-absolute-test';

      const executor = container.putContent(destination, ...files);
      await executor.execute();

      const archive = await container.getArchive(destination);
      const fileFiles = await listEntry(archive);

      expect(fileFiles?.map((item) => {
        return path.basename(item);
      })).toEqual(files.map((item) => { return item.name; }));
    });

    it('put archive to container', async () => {
      const destination = 'put-archive-test';

      const archive = tar.create({ cwd: filedir, portable: true }, ['.']) as unknown as NodeJS.ReadableStream;
      await container.putArchive(destination, archive);

      const archive2 = await container.getArchive(destination);
      const fileFiles = await listEntry(archive2);
      const sourceFiles = fs.readdirSync(filedir);

      expect(fileFiles?.map((item) => {
        return path.basename(item);
      })).toEqual(sourceFiles);
    });

    it('get archive to container', async () => {
      const destination = 'put-archive-test';
      const archive = await container.getArchive(destination);

      const fileFiles = await listEntry(archive);
      const sourceFiles = fs.readdirSync(filedir);

      expect(fileFiles?.map((item) => {
        return path.basename(item);
      })).toEqual(sourceFiles);
    });

    it('get file content from container', async () => {
      const destination = 'put-file-test';
      const file = files[0];

      const fileEntry = await container.getContent(path.join(destination, file.name));
      expect(fileEntry?.body).toBe(file.body);
    });

    it('get no exist file content from container', async () => {
      const fileEntry = await container.getContent('no-exist-file');
      expect(fileEntry).toBeUndefined();
    });

    it('get symlink file content from container', async () => {
      const fileEntry = await container.getContent(path.join('put-archive-test', files[0].symlinkName));
      expect(fileEntry?.body).toBe(files[0].body);
    });

    it('get link file content from container', async () => {
      const fileEntry = await container.getContent(path.join('put-archive-test', files[0].linkName));
      expect(fileEntry?.body).toBe(files[0].body);
    });

    it('container exec command', async () => {
      const scriptName = process.platform === 'win32' ? 'print_message.ps1' : 'print_message.sh';
      const body = fs.readFileSync(path.join(__dirname, `__mocks__/${scriptName}`), 'utf8');
      const putContentExecutor = container.putContent('', {
        name: scriptName,
        mode: 0o777,
        body,
      });
      await putContentExecutor.execute();
      const execExecutor = container.exec([process.platform === 'win32' ? 'powershell' : 'sh', container.resolve(scriptName)]);
      await execExecutor.execute();

      // spawn.stdout.on('data', (data) => {
      //   console.log(`stdout: ${data}`);
      // });
    });

    it('container hashFiles function', async () => {
      const putContentExecutor = container.putContent('', {
        name: 'package.json',
        mode: 0o777,
        body: 'test content',
      });
      await putContentExecutor.execute();

      const hash = container.hashFiles('package.json');
      expect(hash.length).toBe(64);
    });

    it('container hashFiles with --follow-symbolic-links', async () => {
      const hash = container.hashFiles('--follow-symbolic-links', 'package.json');
      expect(hash.length).toBe(64);
    });

    it('container get file env', async () => {
      const putContentExecutor = container.putContent('.', {
        name: 'env',
        mode: 0o777,
        body: ['name=sobird', 'hello=world'].join('\n'),
      });
      await putContentExecutor.execute();

      const envObj = await container.getFileEnv('env');

      expect(envObj).toEqual({
        name: 'sobird',
        hello: 'world',
      });
    });
  });

  describe('Test Container Path Resolve', () => {
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
          expect(container.resolve(source)).toBe(destination);
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
          console.log('container.resolve(source)', container.resolve(source));
          expect(container.resolve(source)).toBe(destination);
        });
      });
    }
  });
});
