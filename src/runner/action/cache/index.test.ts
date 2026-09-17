/**
 * action cache test
 *
 * sobird<i@sobird.me> at 2024/05/07 18:10:39 created.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import simpleGit from 'simple-git';

import { createEachDir } from '@/test/__helpers__';
import { readTar } from '@/utils/readTar';

import ActionCache from '.';

vi.setConfig({
  testTimeout: 10000,
});

const testTmp = createEachDir('actions');

describe('Action Cache Tests', () => {
  const actionCache = new ActionCache(testTmp);

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

      const stream = await actionCache.archive(ref.repository, sha, 'package.json');

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

describe('Action Cache Ref Resolution Tests', () => {
  // its own temp dir, so that it does not race the cache tests above for `os.tmpdir()/actions`
  const cacheDir = createEachDir('actions-ref');
  const actionCache = new ActionCache(cacheDir);

  it('resolves a reused cache to the latest commit of the ref', async () => {
    const origin = await createOrigin();

    try {
      const first = await origin.commit('one');
      expect(await actionCache.fetch(origin.dir, 'owner/repo', origin.branch)).toBe(first);

      const sha = await origin.commit('two');
      const second = await actionCache.fetch(origin.dir, 'owner/repo', origin.branch);
      expect(second).not.toBe(first);
      expect(second).toBe(sha);

      let body = '';
      await readTar(await actionCache.archive('owner/repo', second, 'a.txt'), (header, content) => {
        if (header.path === 'a.txt') {
          body = content.toString();
        }
      });
      expect(body).toBe('two\n');

      // the temporary branch each fetch creates is cleaned up, so the clone's own branch is the only one left
      const repo = simpleGit(path.join(cacheDir, 'owner/repo.git'));
      expect((await repo.branchLocal()).all).toEqual([origin.branch]);
    } finally {
      fs.rmSync(origin.dir, { recursive: true, force: true });
    }
  });

  it('keeps the token out of the bare repository config', async () => {
    const origin = await createOrigin();

    try {
      await origin.commit('one');
      await actionCache.fetch(origin.dir, 'owner/token-repo', origin.branch, 's3cr3t-token');

      const repoPath = path.join(cacheDir, 'owner/token-repo.git');
      expect((await simpleGit(repoPath).raw(['remote', 'get-url', 'origin'])).trim()).toBe(origin.dir);
      expect(fs.readFileSync(path.join(repoPath, 'config'), 'utf8')).not.toContain('s3cr3t-token');
    } finally {
      fs.rmSync(origin.dir, { recursive: true, force: true });
    }
  });
});
