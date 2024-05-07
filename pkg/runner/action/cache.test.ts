/**
 * cache.test.ts
 *
 * sobird<i@sobird.me> at 2024/05/07 18:10:39 created.
 */

import os from 'node:os';

import ActionCache from './cache';

vi.setConfig({
  testTimeout: 10000,
});

// const assert = require('assert');
// const fs = require('fs');
// const tar = require('tar');
// const { pipeline } = require('stream');
// const zlib = require('zlib');

describe('ActionCache Tests', () => {
  let cache: ActionCache;

  beforeEach(() => {
    cache = new ActionCache(os.tmpdir());
  });

  const refs = [
    {
      name: 'Fetch Branch Name',
      cacheDir: 'gitea/git',
      repo: 'https://gitea.com/gitea/git',
      ref: 'master',
    },
    {
      name: 'Fetch Branch Name Absolutely',
      cacheDir: 'gitea/git',
      repo: 'https://gitea.com/gitea/git',
      ref: 'refs/heads/master',
    },
    {
      name: 'Fetch HEAD',
      cacheDir: 'gitea/git',
      repo: 'https://gitea.com/gitea/git',
      ref: 'HEAD',
    },
    {
      name: 'Fetch Sha',
      cacheDir: 'gitea/git',
      repo: 'https://gitea.com/gitea/git',
      ref: '74d7c14dd4a3ed9c5def0dc3c1aeede399ddc5c5',
    },
  ];

  refs.forEach((ref) => {
    it(ref.name, async () => {
      const sha = await cache.fetch(ref.cacheDir, ref.repo, ref.ref);
      assert.notEqual(sha, '', 'SHA should not be empty');

      const tarStream = await cache.archive(ref.cacheDir, sha, 'js');
      assert.ok(tarStream, 'tarStream should not be empty');
    });
  });
});
