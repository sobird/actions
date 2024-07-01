import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import * as tar from 'tar';

import Hosted from './hosted';

const tmp = path.join(os.tmpdir(), 'hosted-test');
const hosted = new Hosted(tmp, '/opt/workspace');

afterAll(() => {
  // fs.rmdirSync(tmp, { recursive: true });
});

describe('test hosted class', () => {
  it('put content to container test case', async () => {
    const files = [
      {
        name: 'test1.txt',
        mode: '0700',
        body: 'copy test content',
      },
      {
        name: 'test2.txt',
        mode: '0700',
        body: 'copy test2 content',
      },
    ];

    const { tmpPath } = hosted;

    await hosted.put(tmpPath, ...files);

    for (const file of files) {
      const body = fs.readFileSync(path.join(tmpPath, file.name), 'utf8');
      expect(body).toBe(file.body);
    }
  });

  it('put dir to container test case', async () => {
    const sourceDir = hosted.tmpPath;
    const destination = path.join(hosted.base, 'put-dir-test');

    const sourceFiles = fs.readdirSync(sourceDir);
    await hosted.putDir(destination, sourceDir);
    const destFiles = fs.readdirSync(destination);

    expect(destFiles).toEqual(sourceFiles);
  });

  it('put archive to container test case', async () => {
    const sourceDir = hosted.tmpPath;
    const destination = path.join(hosted.base, 'put-archive-test');

    const tarStream = tar.create({ cwd: hosted.tmpPath }, ['.']) as unknown as NodeJS.ReadableStream;

    const sourceFiles = fs.readdirSync(sourceDir);
    await hosted.putArchive(destination, tarStream);
    const destFiles = fs.readdirSync(destination);

    expect(destFiles).toEqual(sourceFiles);
  });

  it('get archive to container test case', async () => {
    const sourceDir = hosted.tmpPath;
    const destination = path.join(hosted.base, 'get-archive-test');
    fs.mkdirSync(destination, { recursive: true });

    const info = path.parse(sourceDir);

    const sourceFiles = fs.readdirSync(sourceDir);
    const tarStream = hosted.getArchive(sourceDir);
    tarStream.pipe(tar.extract({
      cwd: destination,
    }));

    await new Promise((resolve) => {
      tarStream.on('finish', () => {
        resolve(null);
      });
    });

    const destFiles = fs.readdirSync(path.join(destination, info.base));

    expect(destFiles).toEqual(sourceFiles);
  });

  it('toContainerPath test case', () => {
    const containerPath = hosted.toContainerPath('/opt/workspace/test.txt');
    expect(containerPath).toBe(path.join(hosted.cwdPath, 'test.txt'));
  });

  it('exec test case', async () => {
    const spawn = await hosted.exec('echo', ['Hello, World! $sobird'], {
      stdio: ['pipe'],
    });

    console.log('spawn', spawn);
    // spawn.stdout.on('data', (data) => {
    //   console.log(`stdout: ${data}`);
    // });
  });
});
