import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import * as tar from 'tar';

import HostedContainer from './hosted';

vi.mock('./hosted');

const testdir = path.join(os.tmpdir(), 'hosted-test');
const filedir = path.join(testdir, 'file');
const hosted: HostedContainer = new (HostedContainer as any)();

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

beforeAll(() => {
  fs.mkdirSync(filedir, { recursive: true });

  for (const file of files) {
    fs.writeFileSync(path.join(filedir, file.name), file.body);
  }
});

afterAll(() => {
  console.log('testdir', testdir);
  // fs.rmdirSync(testdir, { recursive: true });
});

describe('test hosted container class', () => {
  it('docker start container test case', async () => {
    const executor = hosted.start();
    await executor.execute();

    // const id = hosted.container?.id;
    // expect(id).not.toBeUndefined();
  });

  it('hosted put file to container test case', async () => {
    const destination = 'put-file-test';
    const file = files[0];

    const executor = hosted.put(destination, path.join(filedir, file.name));
    await executor.execute();

    const destBody = fs.readFileSync(path.join(hosted.Resolve(destination), file.name), 'utf8');

    expect(destBody).toEqual(file.body);
  });

  it('hosted put dir to container test case', async () => {
    const destination = 'put-dir-test';

    const executor = hosted.put(destination, filedir);
    await executor.execute();

    const sourceFiles = fs.readdirSync(filedir);
    const destFiles = fs.readdirSync(hosted.Resolve(destination));
    expect(destFiles).toEqual(sourceFiles);
  });

  it('put content to container relative directory test case', async () => {
    const destination = 'put-content-relative-test';
    const containerdir = hosted.Resolve(destination);

    const executor = hosted.putContent(destination, ...files);
    await executor.execute();

    for (const file of files) {
      const body = fs.readFileSync(path.join(containerdir, file.name), 'utf8');
      expect(body).toBe(file.body);
    }
  });

  it('put content to container absolute directory test case', async () => {
    const destination = '/put-content-absolute-test';
    const containerdir = hosted.Resolve(destination);

    const executor = hosted.putContent(destination, ...files);
    await executor.execute();

    for (const file of files) {
      const body = fs.readFileSync(path.join(containerdir, file.name), 'utf8');
      expect(body).toBe(file.body);
    }
  });

  it('put archive to container test case', async () => {
    const destination = 'put-archive-test';
    const containerdir = hosted.Resolve(destination);

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

    await new Promise((resolve) => {
      extract.on('finish', () => {
        resolve('');
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
    const execExecutor = hosted.exec([process.platform === 'win32' ? 'powershell' : 'sh', hosted.Resolve(scriptName)]);
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

    expect(hash.length).toBe(64);
  });

  it('container hashFiles with --follow-symbolic-links test case', async () => {
    const hash = hosted.hashFiles('--follow-symbolic-links', 'package.json');
    expect(hash.length).toBe(64);
  });
});

const ddd = hosted.Resolve('hosbi');
console.log('ddd', ddd);
