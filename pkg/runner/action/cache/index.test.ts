/**
 * action cache test
 *
 * sobird<i@sobird.me> at 2024/05/07 18:10:39 created.
 */

import { readTar } from '@/utils/readTar';
import { createEachDir } from '@/utils/test';

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
