import fs from 'node:fs';
import path from 'node:path';

import * as tar from 'tar';

import { createEachDir } from '@/utils/test';

import HostedContainer from './hosted';

vi.mock('./hosted');
const hosted: HostedContainer = new (HostedContainer as any)();

const workdir = '/home/runner';
const testdir = createEachDir('hosted-test');
const filedir = createEachDir('hosted-test', 'file');

const files = [
  {
    name: 'test1.txt',
    // mode: 0o700,
    body: 'test1 content',
  },
  {
    name: 'test2.txt',
    // mode: 0o700,
    body: 'test2 content',
  },
];

console.log('filedir', filedir);

beforeAll(() => {
  for (const file of files) {
    fs.writeFileSync(path.join(filedir, file.name), file.body);
  }
});

afterAll(() => {
  console.log('testdir', testdir);
});

describe('Test Hosted Container', () => {
  it('start hosted container', async () => {
    const executor = hosted.start();

    expect(async () => {
      await executor.execute();
    }).not.throw();

    // const id = hosted.container?.id;
    // expect(id).not.toBeUndefined();
  });

  it('hosted put file to container test case', async () => {
    const destination = 'put-file-test';
    const file = files[0];

    const executor = hosted.put(destination, path.join(filedir, file.name));
    await executor.execute();

    const destBody = fs.readFileSync(path.join(hosted.resolve(destination), file.name), 'utf8');

    expect(destBody).toEqual(file.body);
  });

  it('hosted put dir to container test case', async () => {
    const destination = 'put-dir-test';

    const executor = hosted.put(destination, filedir);
    await executor.execute();

    const sourceFiles = fs.readdirSync(filedir);
    const destFiles = fs.readdirSync(hosted.resolve(destination));
    expect(destFiles).toEqual(sourceFiles);
  });

  it('put content to container relative directory test case', async () => {
    const destination = 'put-content-relative-test';
    const containerdir = hosted.resolve(destination);

    const executor = hosted.putContent(destination, ...files);
    await executor.execute();

    for (const file of files) {
      const body = fs.readFileSync(path.join(containerdir, file.name), 'utf8');
      expect(body).toBe(file.body);
    }
  });

  it('put content to container absolute directory test case', async () => {
    const destination = '/put-content-absolute-test';
    const containerdir = hosted.resolve(destination);

    const executor = hosted.putContent(destination, ...files);
    await executor.execute();

    for (const file of files) {
      const body = fs.readFileSync(path.join(containerdir, file.name), 'utf8');
      expect(body).toBe(file.body);
    }
  });

  it('put archive to container test case', async () => {
    const destination = 'put-archive-test';
    const containerdir = hosted.resolve(destination);

    const archive = tar.create({ cwd: filedir, portable: true }, ['.']) as unknown as NodeJS.ReadableStream;

    await hosted.putArchive(destination, archive);

    const sourceFiles = fs.readdirSync(filedir);
    const destFiles = fs.readdirSync(containerdir);

    expect(destFiles).toEqual(sourceFiles);
  });

  it('get archive to container test case', async () => {
    const destination = 'put-archive-test';
    const archive = await hosted.getArchive(destination);

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

    await new Promise<void>((resolve) => {
      extract.on('finish', () => {
        resolve();
      });
    });

    expect(archiveFiles).toEqual(files);
  });

  it('container exec test case', async () => {
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

  it('container hashFiles test case', async () => {
    const putContentExecutor = hosted.putContent('', {
      name: 'package.json',
      mode: 0o777,
      body: 'test content',
    });
    await putContentExecutor.execute();

    const hash = hosted.hashFiles('package.json');
    console.log('hash', hash);

    expect(hash.length).toBe(64);
  });

  it('container hashFiles with --follow-symbolic-links test case', async () => {
    const hash = hosted.hashFiles('--follow-symbolic-links', 'package.json');
    expect(hash.length).toBe(64);
  });

  it('container getFileEnv test case', async () => {
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

describe('test docker container path resolve', () => {
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
