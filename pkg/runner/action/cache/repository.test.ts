/**
 * cache.test.ts
 *
 * sobird<i@sobird.me> at 2024/05/07 18:10:39 created.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import Git from '@/pkg/common/git';
import { readTar } from '@/utils/readTar';

import ActionCacheRepository from './repository';

vi.setConfig({
  testTimeout: 10000,
});

const testTmp = path.join(os.tmpdir(), 'actions');
const repoTmp = path.join(os.tmpdir(), 'repositorys');

beforeAll(() => {
  fs.mkdirSync(testTmp, { recursive: true });
});
afterAll(() => {
  // fs.rmdirSync(testTmp, { recursive: true });
});

describe('ActionCacheRepository Tests', () => {
  const actionCache = new ActionCacheRepository(testTmp);

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

      const stream = await actionCache.archive(ref.repository, sha);
      await readTar(stream, (header, content) => {
        assert.ok(content, 'content should not be empty');
        expect(header.size).not.equal(0);
      });
    });
  });
});

describe('ActionCacheRepository With repositories map Tests', async () => {
  const repoDir = path.join(repoTmp, 'gitea/runner-images');
  Git.Clone('https://gitea.com/gitea/runner-images', repoDir);
  const repositorys = {
    'https://gitea.com/gitea/runner-images@HEAD': repoDir,
  };
  const actionCache = new ActionCacheRepository(testTmp, repositorys);

  const repositoryTests = [
    {
      name: 'gitea/runner-images',
      repository: 'gitea/runner-images',
      repo: 'https://gitea.com/gitea/runner-images',
    },
    {
      name: 'gitea/homebrew-gitea',
      repository: 'gitea/homebrew-gitea',
      repo: 'https://gitea.com/gitea/homebrew-gitea',
    },
    {
      name: 'gitea/tea',
      repository: 'gitea/tea',
      repo: 'https://gitea.com/gitea/tea',
    },
    {
      name: 'gitea/log',
      repository: 'gitea/log',
      repo: 'https://gitea.com/gitea/log',
    },
  ];

  repositoryTests.forEach((repository) => {
    it(repository.name, async () => {
      const sha = await actionCache.fetch(repository.repo, repository.repository);
      console.log('sha', sha);
      assert.notEqual(sha, '', 'SHA should not be empty');

      const stream = await actionCache.archive(repository.repository, sha);
      await readTar(stream, (header, content) => {
        assert.ok(content, 'content should not be empty');
        expect(header.size).not.equal(0);
      });
    });
  });
});
