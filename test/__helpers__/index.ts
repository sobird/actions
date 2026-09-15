import { spawnSync } from 'node:child_process';
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

let dockerAvailability: boolean | undefined;

/**
 * 本机是否有可用的 Docker daemon。
 *
 * 结果缓存，一个测试文件里最多探测一次。没有 docker 可执行文件时 spawnSync 会
 * 返回 ENOENT 且 status 为 null，同样算不可用。
 */
export function dockerAvailable() {
  if (dockerAvailability === undefined) {
    dockerAvailability = spawnSync('docker', ['info'], { encoding: 'utf8', timeout: 5000 }).status === 0;
  }
  return dockerAvailability;
}
