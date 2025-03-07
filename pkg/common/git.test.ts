import path from 'node:path';

import { SimpleGit } from 'simple-git';

import { createEachDir } from '@/utils/test';

import Git from './git';

vi.setConfig({
  testTimeout: 20000,
});

interface TestCase {
  prepare: (git: SimpleGit) => Promise<void>;
  assert: (ref?: string, err?: Error) => Promise<void>
}

describe('Test Git', () => {
  const testTmp = createEachDir();
  it('get git first log', async () => {
    const git = new Git(path.join(testTmp, 'first-log'));
    await git.git.init();
    await git.git.commit('first commit', ['--allow-empty']);
    await git.git.commit('second commit', ['--allow-empty']);
    const { latest } = await git.firstLog();

    expect(latest?.message).toBe('first commit');
  });

  it('get git author name', async () => {
    const git = new Git(path.join(testTmp, 'author'));
    await git.git.init();
    await git.git.commit('first commit', ['--allow-empty']);
    await git.git.commit('second commit', ['--allow-empty']);
    const author = await git.author();

    expect(author).toBeDefined();
  });

  it('get git remote url', async () => {
    const dir = path.join(testTmp, 'remote-url');
    const git = new Git(dir);

    const OriginRemoteURL = 'https://git-codecommit.us-east-1.amazonaws.com/v1/repos/my-repo-name';
    await git.git.init().addRemote('origin', OriginRemoteURL);
    expect(await git.remoteURL('origin')).toBe(OriginRemoteURL);

    const upstreamRemoteURL = 'git@github.com/AwesomeOwner/MyAwesomeRepo.git';
    await git.git.addRemote('upstream', upstreamRemoteURL);
    expect(await git.remoteURL('upstream')).toBe(upstreamRemoteURL);
  });

  it('get git remote url(empty url)', async () => {
    const dir = path.join(testTmp, 'remote-url');
    const git = new Git(dir);

    await git.git.init();
    expect(await git.remoteURL()).toBeUndefined();
  });

  it('get git repository info', async () => {
    const testCases = [
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

    for await (const [index, [url, , repository]] of testCases.entries()) {
      const dir = path.join(testTmp, `repository${index}`);
      const git = new Git(dir);
      await git.git.init();
      await git.git.addRemote('origin', url);

      const repoInfo = await git.repoInfo();
      expect(repoInfo.repository).toBe(repository);
    }
  });

  it('git clone test case', async () => {
    const dir = path.join(testTmp, 'git-clone-test');
    const git = new Git(dir);
    await git.clone('https://gitea.com/sobird/actions-test');

    const isRepo = await git.git.checkIsRepo();
    expect(isRepo).toBe(true);
  });

  it('git clone with token test case', async () => {
    const dir = path.join(testTmp, 'git-clone-token-test');
    const git = new Git(dir);
    await git.clone('https://gitea.com/sobird/actions-test', 'main', 'thisistoken');

    const isRepo = await git.git.checkIsRepo();
    expect(isRepo).toBe(true);
  });
});

describe('Test Get Git Ref', () => {
  const testTmp = createEachDir();

  const testCases: Record<string, TestCase> = {
    new_repo: {
      prepare: async () => {},
      assert: async (ref) => {
        expect(ref).toBe('');
      },
    },
    new_repo_with_commit: {
      prepare: async (git) => {
        await git.commit('msg', ['--allow-empty']);
      },
      assert: async (ref) => {
        expect(ref).toBe('refs/heads/master');
      },
    },
    current_head_is_tag: {
      prepare: async (git) => {
        await git.commit('commit msg', ['--allow-empty']);
        await git.addTag('v1.2.3');
        await git.checkout('v1.2.3');
      },
      assert: async (ref) => {
        expect(ref).toBe('refs/tags/v1.2.3');
      },
    },
    current_head_is_same_as_tag: {
      prepare: async (git) => {
        await git.commit('1.4.2 release', ['--allow-empty']);
        await git.addTag('v1.4.2');
      },
      assert: async (ref) => {
        expect(ref).toBe('refs/tags/v1.4.2');
      },
    },
    current_head_is_same_as_multi_tag: {
      prepare: async (git) => {
        await git.commit('1.4.2 release', ['--allow-empty']);
        await git.addTag('v1.4.2');
        await git.addTag('v1.4.3');
      },
      assert: async (ref) => {
        expect(ref).toBe('refs/tags/v1.4.2');
      },
    },
    repo_with_multi_tag: {
      prepare: async (git) => {
        await git.commit('1.4.2 release', ['--allow-empty']);
        await git.addTag('v1.4.2');
        await git.commit('1.4.3 release', ['--allow-empty']);
        await git.addTag('v1.4.3');
        await git.checkout('v1.4.2');
      },
      assert: async (ref) => {
        expect(ref).toBe('refs/tags/v1.4.2');
      },
    },
    current_head_is_not_tag: {
      prepare: async (git) => {
        await git.commit('msg', ['--allow-empty']);
        await git.addTag('v1.4.2');
        await git.commit('msg2', ['--allow-empty']);
      },
      assert: async (ref) => {
        expect(ref).toBe('refs/heads/master');
      },
    },
    current_head_is_another_branch: {
      prepare: async (git) => {
        await git.checkout(['-b', 'mybranch']);
        await git.commit('msg', ['--allow-empty']);
      },
      assert: async (ref) => {
        expect(ref).toBe('refs/heads/mybranch');
      },
    },
  };

  for (const [name, tt] of Object.entries(testCases)) {
    it(name, async () => {
      const dir = path.join(testTmp, name);
      const git = new Git(dir);
      await git.git.init(['--initial-branch', 'master']);

      await tt.prepare(git.git);
      const ref = await git.ref();
      await tt.assert(ref);
    });
  }
});

describe('Git Clone Executor', () => {
  const testTmp = createEachDir();

  const testCases = {
    tag: {
      err: null,
      url: 'https://gitea.com/actions/checkout',
      ref: 'v2',
    },
    branch: {
      err: null,
      url: 'https://gitea.com/sobird/actions-test',
      ref: 'test',
    },
    sha: {
      err: null,
      url: 'https://gitea.com/actions/checkout',
      ref: '5a4ac9002d0be2fb38bd78e4b4dbde5606d7042f',
    },
    'short-sha': {
      err: null,
      url: 'https://gitea.com/actions/checkout',
      ref: '5a4ac90', // 短 SHA 示例
    },
  };

  Object.entries(testCases).forEach(([name, tt]) => {
    test(name, async () => {
      const cloneExecutor = Git.CloneExecutor(path.join(testTmp, name), tt.url, tt.ref);

      await cloneExecutor.execute();
    });
  });
});
