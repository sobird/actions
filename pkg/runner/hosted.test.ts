import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

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

  it('copyTarStream test case', () => {

  });

  it('toContainerPath test case', () => {
    const hosted = new Hosted(tmp, '/opt/workspace');
    const containerPath = hosted.toContainerPath('/opt/workspace/test.txt');
    expect(containerPath).toBe(path.join(hosted.cwdPath, 'test.txt'));
  });
});
