import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const TMPROOT = path.join(os.tmpdir(), `${path.basename(process.cwd())}-test`);

function createTmpPath(...name: string[]) {
  const root = path.join(TMPROOT, randomBytes(8).toString('hex'));
  return { root, dir: path.join(root, ...name) };
}

export function createAllDir(...name: string[]) {
  const { root, dir } = createTmpPath(...name);

  beforeAll(() => {
    fs.mkdirSync(dir, { recursive: true });
  });
  afterAll(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });
  return dir;
}

export function createEachDir(...name: string[]) {
  const { root, dir } = createTmpPath(...name);

  beforeEach(() => {
    fs.mkdirSync(dir, { recursive: true });
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });
  return dir;
}

/** 只能在测试或钩子内部调用：清理挂在 onTestFinished 上。 */
export function createTestFile(name: string = 'test-file', data: string = '') {
  const { root, dir } = createTmpPath(name);
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(dir, data);

  onTestFinished(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });
  return dir;
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
