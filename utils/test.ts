import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function testDir(tmp: string = 'test-dir') {
  const baseDir = path.join(os.tmpdir(), tmp);
  beforeEach(() => {
    fs.mkdirSync(baseDir, { recursive: true });
  });
  afterEach(() => {
    fs.rmdirSync(baseDir, { recursive: true });
  });
  return baseDir;
}

export function testFile(name: string = 'test-file') {
  const file = path.join(os.tmpdir(), 'test', name);
  const dir = path.dirname(file);
  beforeAll(() => {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, '');
  });
  afterAll(() => {
    // fs.rmdirSync(dir, { recursive: true });
  });
  return file;
}
