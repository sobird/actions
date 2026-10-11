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

/**
 * 给本文件里 spawn 出来的 git 一个固定身份，别让它去翻开发机的 `~/.gitconfig`。
 *
 * 有全局配置的机器上 `git commit` 顺带就有了作者，CI runner 上没有，会以
 * 「Author identity unknown」整片失败。GIT_AUTHOR_* / GIT_COMMITTER_* 是 git 身份
 * 的最高优先级来源，且 simple-git 未指定 env 时 spawn 直接继承父进程环境，所以在
 * 测试进程里设一次即可。
 */
export function useGitIdentity(name: string = 'actions-test', email: string = 'actions-test@example.com') {
  beforeEach(() => {
    process.env.GIT_AUTHOR_NAME = name;
    process.env.GIT_AUTHOR_EMAIL = email;
    process.env.GIT_COMMITTER_NAME = name;
    process.env.GIT_COMMITTER_EMAIL = email;
  });

  afterEach(() => {
    for (const key of ['GIT_AUTHOR_NAME', 'GIT_AUTHOR_EMAIL', 'GIT_COMMITTER_NAME', 'GIT_COMMITTER_EMAIL']) {
      delete process.env[key];
    }
  });
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

/**
 * 建表，给挂了 `vi.mock('@/lib/sequelize')` 的测试文件用（`beforeAll(syncSchema)`）。
 *
 * 那个 mock 只把 storage 指到 `:memory:`，不建表 —— 自己再 sync 一次之前，第一次查询就是
 * `no such table`。模型测试不需要它：它们的 `__mocks__/<model>.ts` fixture 顺手建了自己那张表。
 *
 * 动态 import 是必要的：调用点在测试文件里，这样拿到的是被 mock 过的那份实例。
 */
export async function syncSchema() {
  const { sequelize } = await import('@/models');
  await sequelize.sync({ force: true });
}
