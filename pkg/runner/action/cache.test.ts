/**
 * cache.test.ts
 *
 * sobird<i@sobird.me> at 2024/05/07 18:10:39 created.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import * as tar from 'tar';

import ActionCache from './cache';

vi.setConfig({
  testTimeout: 10000,
});

const testTmp = path.join(os.tmpdir(), 'actions');

console.log('testTmp', testTmp);

beforeEach(() => {
  fs.mkdirSync(testTmp, { recursive: true });
});
afterEach(() => {
  // fs.rmdirSync(testTmp, { recursive: true });
});

describe('ActionCache Tests', () => {
  const actionCache = new ActionCache(testTmp);

  const repository = 'sobird/actions-test';
  const repo = 'https://gitea.com/sobird/actions-test';
  const refs = [
    {
      name: 'Fetch Branch Name',
      repository,
      repo,
      ref: 'master',
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

      const tarStream = tar.t({});
      stream?.pipe(tarStream);

      tarStream.on('entry', (entry) => {
        let content = '';
        entry.on('data', (chunk: Buffer) => {
          content += chunk;
        });
        entry.on('end', () => {
          assert.ok(content, 'content should not be empty');
        });
      });
    });
  });
});
