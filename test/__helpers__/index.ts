import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const TMP_ROOT = path.join(os.tmpdir(), `${path.basename(process.cwd())}-test`);

/**
 * 获取一个唯一的临时路径，防止并行测试冲突
 */
function getUniquePath(...name: string[]) {
  return path.join(TMP_ROOT, randomUUID(), ...name);
}

export function createAllDir(...name: string[]) {
  const dir = getUniquePath(...name);

  beforeAll(() => {
    fs.mkdirSync(dir, { recursive: true });
  });
  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });
  return dir;
}

export function createEachDir(...name: string[]) {
  const dir = getUniquePath(...name);

  beforeEach(() => {
    fs.mkdirSync(dir, { recursive: true });
  });
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });
  return dir;
}

export function createTestFile(name: string = 'test-file', data: string = '') {
  const file = getUniquePath(name);
  const dir = path.dirname(file);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, data);

  onTestFinished(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });
  return file;
}
