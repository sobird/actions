/**
 * repository.test.ts
 *
 * sobird<i@sobird.me> at 2024/05/07 18:10:39 created.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';

import { createEachDir } from '@/test/__helpers__';
import { listEntry, readEntry } from '@/utils/tar';

import type ActionCache from '.';
import ActionCacheRepository from './repository';

const REPOSITORY = 'sobird/actions-test';
const REPO_URL = 'https://gitea.com/sobird/actions-test';

// 自己的临时目录：这份缓存的目录原来是共享的 os.tmpdir()/actions，afterAll 里被整个删掉，
// 会和同时在用它的测试文件互相拆台
const cacheDir = createEachDir('action-cache-repository');

/** 映射指向的本地目录，内容按文件树给定，用完即删 */
function createLocalDir(files: Record<string, string>) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'actions-repository-'));
  onTestFinished(() => fs.rmSync(dir, { recursive: true, force: true }));

  for (const [name, body] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    fs.writeFileSync(path.join(dir, name), body);
  }
  return dir;
}

/** 不碰磁盘和网络的 parent，只记录调用，用来断言没命中映射时是否原样转发 */
function createParent() {
  return {
    fetch: vi.fn().mockResolvedValue('parent-sha'),
    archive: vi.fn().mockResolvedValue(Readable.from('')),
  } as unknown as ActionCache;
}

describe('ActionCacheRepository', () => {
  it('serves a repository mapped by its exact url and ref', async () => {
    const localDir = createLocalDir({ 'test/workflows/inputs.yml': 'name: inputs\n' });
    const parent = createParent();
    const actionCache = new ActionCacheRepository(cacheDir, { [`${REPO_URL}@HEAD`]: localDir }, parent);

    // 命中映射时 fetch 返回的就是当初请求的那个 ref，archive 再把它当 revision
    await expect(actionCache.fetch(REPO_URL, REPOSITORY)).resolves.toBe('HEAD');

    const entry = await readEntry(await actionCache.archive(REPO_URL, REPOSITORY, 'HEAD', 'test/workflows/inputs.yml'));
    expect(entry && entry.body).toBe('name: inputs\n');
    expect(parent.fetch).not.toHaveBeenCalled();
  });

  it('serves a repository mapped by the path of its url', async () => {
    const localDir = createLocalDir({ 'a.txt': 'mapped\n' });
    const parent = createParent();
    // 映射的键也可以只写 owner/repo，url 里的 path 用来匹配
    const actionCache = new ActionCacheRepository(cacheDir, { [`${REPOSITORY}@HEAD`]: localDir }, parent);

    await expect(actionCache.fetch(REPO_URL, REPOSITORY)).resolves.toBe('HEAD');

    const entry = await readEntry(await actionCache.archive(REPO_URL, REPOSITORY, 'HEAD', 'a.txt'));
    expect(entry && entry.body).toBe('mapped\n');
    expect(parent.fetch).not.toHaveBeenCalled();
  });

  it('archives a mapped directory from the repository root, keeping the sub path', async () => {
    const localDir = createLocalDir({
      'test/workflows/inputs.yml': 'name: inputs\n',
      'test/actions/hello/action.yml': 'name: hello\n',
    });
    const parent = createParent();
    const actionCache = new ActionCacheRepository(cacheDir, { [`${REPO_URL}@HEAD`]: localDir }, parent);

    const ref = await actionCache.fetch(REPO_URL, REPOSITORY);
    // 从仓库根打包，条目因此保留 test/ 这一层，跟 `git archive <ref> test` 的输出一致
    const names = (await listEntry(await actionCache.archive(REPO_URL, REPOSITORY, ref, 'test'))) ?? [];

    // tar 的条目顺序跟着 readdir 走，排序后比较
    expect(names.toSorted()).toEqual(['test/actions/hello/action.yml', 'test/workflows/inputs.yml']);
    expect(parent.archive).not.toHaveBeenCalled();
  });

  it('forwards to the parent when the repository is not mapped', async () => {
    const parent = createParent();
    // 映射里只有 main，下面的 HEAD 和本地路径都不该命中
    const actionCache = new ActionCacheRepository(cacheDir, { [`${REPO_URL}@main`]: '/tmp/elsewhere' }, parent);

    await expect(actionCache.fetch(REPO_URL, REPOSITORY)).resolves.toBe('parent-sha');
    await expect(actionCache.fetch('/tmp/local-repo', REPOSITORY, 'main', 'the-token')).resolves.toBe('parent-sha');

    expect(parent.fetch).toHaveBeenNthCalledWith(1, REPO_URL, REPOSITORY, 'HEAD', undefined);
    expect(parent.fetch).toHaveBeenNthCalledWith(2, '/tmp/local-repo', REPOSITORY, 'main', 'the-token');
  });

  it('forwards archive to the parent for a repository it never fetched', async () => {
    const parent = createParent();
    // 映射里有这个仓库，但这次运行没 fetch 过它，cacheDirCache 里就没有它的目录
    const actionCache = new ActionCacheRepository(cacheDir, { [`${REPO_URL}@HEAD`]: '/tmp/elsewhere' }, parent);

    await actionCache.archive(REPO_URL, REPOSITORY, 'HEAD');

    expect(parent.archive).toHaveBeenCalledWith(REPO_URL, REPOSITORY, 'HEAD', '.');
  });
});
