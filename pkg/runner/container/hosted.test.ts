import fs from 'node:fs';
import path from 'node:path';

import * as tar from 'tar';

import { createAllDir } from '@/utils/test';

import { FileEntry } from '.';
import HostedContainer from './hosted';

vi.mock('./hosted');
const hosted: HostedContainer = new (HostedContainer as any)();

const workdir = '/home/runner';
const testdir = createAllDir('hosted-test');
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

afterAll(async () => {
  console.log('testdir', testdir);
  const removeExecutor = hosted.remove();
  await removeExecutor.execute();
});

describe('Test Hosted Container', () => {
  it('start hosted container', async () => {
    const executor = hosted.start();

    expect(async () => {
      await executor.execute();
    }).not.toThrowError();
  });

  it('put file to container', async () => {
    const destination = 'put-file-test';
    const file = files[0];
    const sourceFile = path.join(filedir, file.name);

    const executor = hosted.put(destination, sourceFile);
    await executor.execute();

    const destBody = fs.readFileSync(path.join(hosted.resolve(destination), file.name), 'utf8');
    expect(destBody).toEqual(file.body);
  });

  it('put dir to container', async () => {
    const destination = 'put-dir-test';

    const executor = hosted.put(destination, filedir);
    await executor.execute();

    const sourceFiles = fs.readdirSync(filedir);
    const destFiles = fs.readdirSync(hosted.resolve(destination));
    expect(destFiles).toEqual(sourceFiles);
  });

  it('put content to container relative directory', async () => {
    const destination = 'put-content-relative-test';
    const containerdir = hosted.resolve(destination);

    const executor = hosted.putContent(destination, ...files);
    await executor.execute();

    for (const file of files) {
      const body = fs.readFileSync(path.join(containerdir, file.name), 'utf8');
      expect(body).toBe(file.body);
    }
  });

  it('put content to container absolute directory', async () => {
    const destination = '/put-content-absolute-test';
    const containerdir = hosted.resolve(destination);

    const executor = hosted.putContent(destination, ...files);
    await executor.execute();

    for (const file of files) {
      const body = fs.readFileSync(path.join(containerdir, file.name), 'utf8');
      expect(body).toBe(file.body);
    }
  });

  it('put archive to container', async () => {
    const destination = 'put-archive-test';
    const containerdir = hosted.resolve(destination);

    const archive = tar.create({ cwd: filedir, portable: true }, ['.']) as unknown as NodeJS.ReadableStream;
    await hosted.putArchive(destination, archive);

    const sourceFiles = fs.readdirSync(filedir);
    const destFiles = fs.readdirSync(containerdir);

    expect(destFiles).toEqual(sourceFiles);
  });

  it('get archive to container', async () => {
    const destination = 'put-archive-test';
    const archive = await hosted.getArchive(destination);

    const extract = tar.t({});
    archive.pipe(extract);

    const archiveFiles: FileEntry[] = [];
    extract.on('entry', (entry: tar.ReadEntry) => {
      let body = '';
      entry.on('data', (chunk: Buffer) => {
        body += chunk;
      });
      entry.on('end', () => {
        if (entry.type !== 'Directory') {
          archiveFiles.push({
            name: path.basename(entry.path),
            body,
          });
        }
      });
    });

    await new Promise<void>((resolve) => {
      extract.on('finish', () => {
        resolve();
      });
    });

    const expectedFiles = archiveFiles.map((item) => { return item.name; });
    const testFiles = files.reduce((a: string[], b) => {
      return a.concat([b.name, b.linkName, b.symlinkName]);
    }, []);

    expect(expectedFiles.sort()).toEqual(testFiles.sort());
  });

  it('get file content from container', async () => {
    const destination = 'put-file-test';
    const file = files[0];

    const fileEntry = await hosted.getContent(path.join(destination, file.name));
    expect(fileEntry?.body).toBe(file.body);
  });

  it('get no exist file content from container', async () => {
    const fileEntry = await hosted.getContent('no-exist-file');
    expect(fileEntry).toBeUndefined();
  });

  it('get symlink file content from container', async () => {
    const fileEntry = await hosted.getContent(path.join('put-archive-test', files[0].symlinkName));
    expect(fileEntry?.body).toBe(files[0].body);
  });

  it('get link file content from container', async () => {
    const fileEntry = await hosted.getContent(path.join('put-archive-test', files[0].linkName));
    expect(fileEntry?.body).toBe(files[0].body);
  });

  it('container exec command', async () => {
    const scriptName = process.platform === 'win32' ? 'print_message.ps1' : 'print_message.sh';
    const body = fs.readFileSync(path.join(__dirname, `__mocks__/${scriptName}`), 'utf8');
    const putContentExecutor = hosted.putContent('', {
      name: scriptName,
      mode: 0o777,
      body,
    });
    await putContentExecutor.execute();
    const execExecutor = hosted.exec([process.platform === 'win32' ? 'powershell' : 'sh', hosted.resolve(scriptName)]);
    await execExecutor.execute();

    // spawn.stdout.on('data', (data) => {
    //   console.log(`stdout: ${data}`);
    // });
  });

  it('container hashFiles function', async () => {
    const putContentExecutor = hosted.putContent('', {
      name: 'package.json',
      mode: 0o777,
      body: 'test content',
    });
    await putContentExecutor.execute();

    const hash = hosted.hashFiles('package.json');
    expect(hash.length).toBe(64);
  });

  it('container hashFiles with --follow-symbolic-links', async () => {
    const hash = hosted.hashFiles('--follow-symbolic-links', 'package.json');
    expect(hash.length).toBe(64);
  });

  it('container get file env', async () => {
    const putContentExecutor = hosted.putContent('.', {
      name: 'env',
      mode: 0o777,
      body: ['name=sobird', 'hello=world'].join('\n'),
    });
    await putContentExecutor.execute();

    const envObj = await hosted.getFileEnv('env');

    expect(envObj).toEqual({
      name: 'sobird',
      hello: 'world',
    });
  });
});

describe('Test Hosted Container Path Resolve', () => {
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
        expect(hosted.resolve(source)).toBe(destination);
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
        expect(hosted.resolve(source)).toBe(path.join(hosted.rootdir, destination));
      });
    });
  }
});

const paths = [
  '/usr/local/opt/mysql-client/bin',
  '/usr/local/bin',
  '/usr/bin',
  '/bin',
  ' ',
];

describe('Container Shared Utils Test', () => {
  it('Join Path', () => {
    const PATH = hosted.joinPath(...paths);
    expect(PATH).toBe(paths.join(':'));
  });

  it('Apply Path', async () => {
    const env = {
      PATH: '/test/bin',
    };
    const prependPath = paths;

    const newEnv = await hosted.applyPath(prependPath, env);
    expect(newEnv.PATH).toBe(hosted.joinPath(...prependPath, '/test/bin'));
  });

  it('Look Path', () => {
    const env = {
      PATH: hosted.joinPath(...paths),
    };

    const cmd = hosted.lookPath('node', env);
    expect(cmd).not.toBe('');
  });
});
