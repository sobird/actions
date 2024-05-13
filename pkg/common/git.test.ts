/* eslint-disable no-await-in-loop */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { SimpleGit } from 'simple-git';

import Git from './git';

const testTmp = path.join(os.tmpdir(), 'git-test');

beforeEach(() => {
  fs.mkdirSync(testTmp, { recursive: true });
});
afterEach(() => {
  fs.rmdirSync(testTmp, { recursive: true });
});

describe('Test Git', () => {
  it('get remote url test case', async () => {
    const wantRemoteURL = 'https://git-codecommit.us-east-1.amazonaws.com/v1/repos/my-repo-name';
    const dir = path.join(testTmp, 'remote-url');
    fs.mkdirSync(dir, { recursive: true });
    const git = new Git(dir);
    await git.git.init();
    await git.git.addRemote('origin', wantRemoteURL);

    const remoteURL = await git.remoteURL();
    expect(remoteURL?.refs.fetch).toBe(wantRemoteURL);
  });

  it('get repository test case', async () => {
    const rangeTest = [
      ['https://git-codecommit.us-east-1.amazonaws.com/v1/repos/my-repo-name', 'CodeCommit', 'v1/repos/my-repo-name'],
      ['ssh://git-codecommit.us-west-2.amazonaws.com/v1/repos/my-repo', 'CodeCommit', 'v1/repos/my-repo'],
      ['git@github.com:nektos/act.git', 'GitHub', 'nektos/act'],
      ['git@github.com:nektos/act', 'GitHub', 'nektos/act'],
      ['https://github.com/nektos/act.git', 'GitHub', 'nektos/act'],
      ['http://github.com/nektos/act.git', 'GitHub', 'nektos/act'],
      ['https://github.com/nektos/act', 'GitHub', 'nektos/act'],
      ['http://github.com/nektos/act', 'GitHub', 'nektos/act'],
      ['git+ssh://git@github.com/owner/repo.git', 'GitHub', 'owner/repo'],
      ['http://myotherrepo.com/act.git', '', 'act'],
    ];

    for (const [index, [url, , slug]] of rangeTest.entries()) {
      const dir = path.join(testTmp, `repository${index}`);
      fs.mkdirSync(dir, { recursive: true });
      const git = new Git(dir);
      await git.git.init();
      await git.git.addRemote('origin', url);

      const repository = await git.repository();
      expect(repository).toBe(slug);
    }
  });

  it('get git ref test case', async () => {
    const testRange: Record<string, {
      prepare: (git?: SimpleGit) => Promise<void>;
      assert: (ref?: string, err?: Error) => Promise<void>
    }> = {
      new_repo: {
        prepare: async () => {},
        assert: async (ref) => {
          expect(ref).toBe('');
        },
      },
      new_repo_with_commit: {
        prepare: async (gitCli) => {
          await gitCli?.commit('msg', ['--allow-empty']);
        },
        assert: async (ref) => {
          expect(ref).toBe('refs/heads/master');
        },
      },

      current_head_is_tag: {
        prepare: async (gitCli) => {
          await gitCli?.commit('commit msg', ['--allow-empty']);
          await gitCli?.addTag('v1.2.3');
          await gitCli?.checkout('v1.2.3');
        },
        assert: async (ref) => {
          expect(ref).toBe('refs/tags/v1.2.3');
        },
      },

      current_head_is_same_as_tag: {
        prepare: async (gitCli) => {
          await gitCli?.commit('1.4.2 release', ['--allow-empty']);
          await gitCli?.addTag('v1.4.2');
        },
        assert: async (ref) => {
          expect(ref).toBe('refs/tags/v1.4.2');
        },
      },

      current_head_is_not_tag: {
        prepare: async (gitCli) => {
          await gitCli?.commit('msg', ['--allow-empty']);
          await gitCli?.addTag('v1.4.2');
          await gitCli?.commit('msg2', ['--allow-empty']);
        },
        assert: async (ref) => {
          expect(ref).toBe('refs/heads/master');
        },
      },
      current_head_is_another_branch: {
        prepare: async (gitCli) => {
          await gitCli?.checkout(['-b', 'mybranch']);
          await gitCli?.commit('msg', ['--allow-empty']);
        },
        assert: async (ref) => {
          expect(ref).toBe('refs/heads/mybranch');
        },
      },
    };

    for (const [name, item] of Object.entries(testRange)) {
      const dir = path.join(testTmp, name);
      fs.mkdirSync(dir, { recursive: true });
      const git = new Git(dir);
      await git.git.init(['--initial-branch', 'master']);

      await item.prepare(git.git);
      try {
        const refname = await git.refname();
        await item.assert(refname);
      } catch (err) {
        await item.assert('', err as Error);
      }
      // console.log('ref', ref);
    }
  });
});
