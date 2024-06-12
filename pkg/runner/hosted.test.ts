import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import * as tar from 'tar';

import Hosted from './hosted';

const tmp = path.join(os.tmpdir(), 'hosted');

afterEach(() => {
  fs.rmdirSync(tmp, { recursive: true });
});

describe('test hosted class', () => {
  const filename = 'copytest';
  const filebody = 'copy test';
  it('copy test case', () => {
    const hosted = new Hosted(tmp, '/opt/workspace');

    hosted.copy({
      name: filename,
      mode: '0700',
      body: 'copy test',
    });

    const body = fs.readFileSync(path.join(hosted.cwdPath, filename), 'utf8');
    expect(body).toBe(filebody);
  });

  it('copyDir test case', async () => {
    const hosted = new Hosted(tmp, '/opt/workspace');

    const sourceDir = path.join(__dirname, '__mocks__/data');

    const sourceFiles = fs.readdirSync(sourceDir);
    await hosted.copyDir(sourceDir);
    const destFiles = fs.readdirSync(hosted.cwdPath);

    expect(destFiles).toEqual(sourceFiles);
  });

  it('copyTarStream test case', async () => {
    const hosted = new Hosted(tmp, '/opt/workspace');
    const tarFilePath = path.join(__dirname, '__mocks__/tarStream.tar');
    const rs1 = fs.createReadStream(tarFilePath);
    const rs2 = fs.createReadStream(tarFilePath);

    await hosted.copyTarStream(rs1);
    const files = fs.readdirSync(hosted.cwdPath, { recursive: true });

    const tarList = new Promise<string[]>((resolve, reject) => {
      const tarStream = tar.t({});
      rs2.pipe(tarStream);

      const tarFiles: string[] = [];
      tarStream.on('entry', (entry) => {
        entry.on('end', () => {
          tarFiles.push(entry.path.replace(/\/$/g, ''));
        });
      });

      tarStream.on('end', () => {
        resolve(tarFiles);
      });
      tarStream.on('error', (err) => {
        reject(err);
      });
    });

    const tarFiles = await tarList;
    expect(files.sort()).toEqual(tarFiles.sort());
  });

  it('toContainerPath test case', () => {
    const hosted = new Hosted(tmp, '/opt/workspace');
    const containerPath = hosted.toContainerPath('/opt/workspace/test.txt');
    expect(containerPath).toBe(path.join(hosted.cwdPath, 'test.txt'));
  });
});
