import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const projectName = path.basename(process.cwd());

export function createAllDir(...name: string[]) {
  const dir = path.join(os.tmpdir(), `${projectName}-test`, ...name);
  beforeAll(() => {
    fs.mkdirSync(dir, { recursive: true });
  });
  afterAll(() => {
    try {
      fs.rmdirSync(dir, { recursive: true });
    } catch (err) {
      //
    }
  });
  return dir;
}

export function createEachDir(...name: string[]) {
  const dir = path.join(os.tmpdir(), `${projectName}-test`, ...name);
  beforeEach(() => {
    fs.mkdirSync(dir, { recursive: true });
  });
  afterEach(() => {
    try {
      fs.rmdirSync(dir, { recursive: true });
    } catch (err) {
      //
    }
  });
  return dir;
}

export function createTestFile(name: string = 'test-file', data: string = '') {
  const file = path.join(os.tmpdir(), `${projectName}-test`, name);
  const dir = path.dirname(file);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, data);
  onTestFinished(() => {
    fs.rmdirSync(dir, { recursive: true });
  });
  return file;
}

export async function tryCatch(fn: () => void | Promise<void>) {
  try {
    await fn();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
  }
}
