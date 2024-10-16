import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function createTestDir(...name: string[]) {
  const baseDir = path.join(os.tmpdir(), ...name);
  beforeEach(() => {
    fs.mkdirSync(baseDir, { recursive: true });
  });
  afterEach(() => {
    fs.rmdirSync(baseDir, { recursive: true });
  });
  return baseDir;
}

export function createTestFile(name: string = 'test-file') {
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
