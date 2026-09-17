/**
 * cache.test.ts
 *
 * sobird<i@sobird.me> at 2024/05/07 18:10:39 created.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import simpleGit from 'simple-git';

import { createEachDir } from '@/test/__helpers__';
import { readTar } from '@/utils/readTar';

import ActionCacheOffline from './offline';
import ActionCacheRepository from './repository';

vi.setConfig({
  testTimeout: 10000,
});

const testTmp = path.join(os.tmpdir(), 'actions');

beforeAll(() => {
  fs.mkdirSync(testTmp, { recursive: true });
});
afterAll(() => {
  fs.rmSync(testTmp, { recursive: true });
});

describe('ActionCache Tests', () => {
  const actionCache = new ActionCacheOffline(testTmp);

  const repository = 'sobird/actions-test';
  const repo = 'https://gitea.com/sobird/actions-test';
  const refs = [
    {
      name: 'Fetch Branch Name',
      repository,
      repo,
      ref: 'main',
    },
    {
      name: 'Fetch Branch Name Absolutely',
      repository,
      repo,
      ref: 'refs/heads/master',
    },
    {
      name: 'Fetch HEAD',
      repository,
      repo,
      ref: 'HEAD',
    },
    {
      name: 'Fetch Sha',
      repository,
      repo,
      ref: '62f365c5242878ab2a5ff76c047724548ea56664',
    },
  ];

  refs.forEach((ref) => {
    it(ref.name, async () => {
      const sha = await actionCache.fetch(ref.repo, ref.repository, ref.ref);
      assert.notEqual(sha, '', 'SHA should not be empty');

      const stream = await actionCache.archive(ref.repo, ref.repository, sha, '');
      await readTar(stream, (header, content) => {
        assert.ok(content, 'content should not be empty');
        expect(header.size).not.equal(0);
      });
    });
  });
});

/** 建一个本地 origin 仓库，作为 fetch 的远端，避免测试依赖网络。 */
async function createOrigin() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'actions-origin-'));
  const git = simpleGit(dir);
  await git.init();

  const branch = (await git.raw(['symbolic-ref', '--short', 'HEAD'])).trim();
  const commit = async (message: string) => {
    fs.writeFileSync(path.join(dir, 'a.txt'), `${message}\n`);
    await git.add('a.txt');
    await git.commit(message);
    return (await git.revparse('HEAD')).trim();
  };

  return { dir, branch, commit };
}

describe('ActionCacheOffline Tests', () => {
  // its own temp dir, so that it does not race the cache tests above for `os.tmpdir()/actions`
  const cacheDir = createEachDir('actions-offline');
  const actionCache = new ActionCacheOffline(cacheDir);
  const mappedCacheDir = createEachDir('actions-offline-mapped-cache');
  const mappedRepoDir = createEachDir('actions-offline-mapped-repo');

  it('keeps using the recorded commit instead of fetching a newer one', async () => {
    const origin = await createOrigin();

    try {
      const first = await origin.commit('one');
      expect(await actionCache.fetch(origin.dir, 'owner/repo', origin.branch)).toBe(first);

      // 远端又动了一个提交：离线模式下不该再去拉，仍旧用记下的那个
      const second = await origin.commit('two');
      expect(second).not.toBe(first);
      expect(await actionCache.fetch(origin.dir, 'owner/repo', origin.branch)).toBe(first);
    } finally {
      fs.rmSync(origin.dir, { recursive: true, force: true });
    }
  });

  it('serves the recorded commit with the remote gone', async () => {
    const origin = await createOrigin();
    const sha = await origin.commit('one');

    expect(await actionCache.fetch(origin.dir, 'owner/repo', origin.branch)).toBe(sha);

    fs.rmSync(origin.dir, { recursive: true, force: true });
    expect(await actionCache.fetch(origin.dir, 'owner/repo', origin.branch)).toBe(sha);
  });

  it('rejects when the remote is gone and nothing was recorded', async () => {
    const missing = path.join(os.tmpdir(), 'actions-missing-origin');
    fs.rmSync(missing, { recursive: true, force: true });

    await expect(actionCache.fetch(missing, 'owner/other', 'main')).rejects.toThrow();
  });

  it('prefers the repository mapping over an existing offline record', async () => {
    const origin = await createOrigin();
    fs.writeFileSync(path.join(mappedRepoDir, 'a.txt'), 'mapped\n');

    try {
      const sha = await origin.commit('one');
      // 先让离线缓存为这个 (host, repo, ref) 记下一份提交，模拟「以前从远端用过」
      const cached = new ActionCacheOffline(mappedCacheDir);
      expect(await cached.fetch(origin.dir, 'owner/repo', origin.branch)).toBe(sha);

      // 同一个来源改成映射到本地目录：映射在最外层，必须压过那条离线记录
      const mapped = new ActionCacheRepository(
        mappedCacheDir,
        { [`${origin.dir}@${origin.branch}`]: mappedRepoDir },
        cached,
      );
      const ref = await mapped.fetch(origin.dir, 'owner/repo', origin.branch);
      expect(ref).toBe(origin.branch);

      const contents: string[] = [];
      await readTar(await mapped.archive(origin.dir, 'owner/repo', ref, 'a.txt'), (_, content) =>
        contents.push(content.toString()),
      );
      expect(contents).toEqual(['mapped\n']);
    } finally {
      fs.rmSync(origin.dir, { recursive: true, force: true });
    }
  });
});
