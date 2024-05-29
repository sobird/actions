/**
 * git.ts
 *
 * sobird<i@sobird.me> at 2024/05/11 1:46:13 created.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import GitUrlParse from 'git-url-parse';
import simpleGit from 'simple-git';

export { GitError } from 'simple-git';

class Git {
  git;

  name: string;

  constructor(public base: string) {
    fs.mkdirSync(base, { recursive: true });
    this.name = path.basename(path.resolve(base));

    this.git = simpleGit(base, {
      progress({ method, stage, progress }) {
        console.log(`git ${method} ${stage} stage ${progress}% complete`);
      },
    });
  }

  async firstLog() {
    return this.git.log([await this.git.firstCommit()]);
  }

  async username() {
    const { git } = this;
    const gitUsername = (await git.getConfig('user.name')).value;
    const logUsername = (await git.log(['-n', '1'])).latest?.author_name;

    return logUsername || gitUsername;
  }

  async fileSha(filename: string) {
    return (await this.git.log(['--pretty=%H', '-1', filename])).latest?.hash;
  }

  async fetch(url: string, ref: string = 'HEAD') {
    const { git } = this;

    const options = ['--recurse-submodules'];
    await git.clone(url, this.base, options);

    const sha = await git.revparse(ref);
    await git.checkout(sha);

    return sha;
  }

  async clone(repoPath: string) {
    try {
      const options = ['--recurse-submodules'];
      await this.git.clone(repoPath, options);
    } catch (error) {
      // logger.Errorf('Unable to clone %v %s: %v', input.URL, refName, err);
    }
  }

  async revision() {
    const shortSha = await this.git.revparse(['--short', 'HEAD']);
    const sha = await this.git.revparse(['HEAD']);
    return {
      shortSha,
      sha,
    };
  }

  /**
   * 获取当前 ref，形如：refs/heads/main
   *
   * @returns
   */
  async ref() {
    let refTag;
    let refBranch;

    const raw = await this.git.raw(['for-each-ref', '--format', '%(refname)']);
    const refnames = raw.trim().split('\n');

    const headSha = await this.git.revparse('HEAD');

    for (const ref of refnames) {
      // eslint-disable-next-line no-await-in-loop
      const sha = await this.git.revparse(ref);
      /* tags and branches will have the same hash
       * when a user checks out a tag, it is not mentioned explicitly
       * in the go-git package, we must identify the revision
       * then check if any tag matches that revision,
       * if so then we checked out a tag
       * else we look for branches and if matches,
       * it means we checked out a branch
       *
       * If a branches matches first we must continue and check all tags (all references)
       * in case we match with a tag later in the interation
       */
      if (sha === headSha) {
        if (ref.startsWith('refs/tags')) {
          refTag = ref;
        }
        if (ref.startsWith('refs/heads')) {
          refBranch = ref;
        }
      }

      if (!refTag && !refBranch) {
        throw Error('');
      }
    }

    return refTag || refBranch;
  }

  /**
   * 获取本地仓库名称，形如： user/repo
   */
  async repoInfo(remoteName?: string) {
    const remoteURL = await this.remoteURL(remoteName);
    if (!remoteURL) {
      // 认为第一条提交的用户为owner
      const { latest } = await this.firstLog();
      const owner = latest?.author_name;
      const { name } = this;
      return {
        owner,
        name,
        slug: `${owner}/${name}`,
        url: '',
      };
    }

    const { owner, name, full_name: slug } = GitUrlParse(remoteURL.refs.fetch);

    return {
      owner,
      name,
      slug,
      url: remoteURL.refs.fetch,
    };
  }

  async remoteURL(remoteName: string = 'origin') {
    return (await this.git.getRemotes(true)).find((remote) => { return remote.name === remoteName; });
  }

  static async Ref(gitDir: string) {
    const git = simpleGit(gitDir);
    const { current } = await git.branchLocal();
    return current;
  }

  static async Clone(repoPath: string, localPath: string, refName: string, token?: string) {
    fs.mkdirSync(localPath, { recursive: true });
    const git = simpleGit(localPath);

    // git.checkIsRepo().then((isRepo) => {
    //   console.log('isRepo', isRepo);
    // });

    try {
      await git.status();
      // logger.info(`Repository already exists at ${localPath}`);
    } catch (err) {
      const options = ['--recurse-submodules', '--branch', refName];
      await git.clone(repoPath, localPath, options);
    }

    // await git.addRemote('origin', `${repoPath}`, {
    //   'x-access-token': 122,
    // });

    await git.checkout(refName);
  }
}

export default Git;

const testTmp = path.join(os.tmpdir(), 'git-test');
Git.Clone('https://github.com/sobird/actions-test', testTmp, 'main');

// const git = new Git('/Users/sobird/test/git-test');
// await git.fetch('https://gitea.com/actions/checkout', 'v4', 'ddd');
// // get short sha
// // const ref = await git.revparse();
// const sha = await git.revparse('refs/tags/v1.2.3');
// const sha2 = await git.revparse('HEAD');
// const tags = await git.tags();
// const branches = await git.branch();
// const br = await git.branch(['--show-current']);
// const raw = await git.raw(['for-each-ref', '--format', '%(refname)']);

// console.log('sha', sha);
// console.log('sha2', sha2);
// console.log('tags', tags);
// console.log('branches', branches);
// console.log('br', br);
// console.log('raw', raw.trim().split('\n'));

// const ref = await git.branchLocal();
// console.log('ref', ref);

// const exists = await git.checkIsRepo();
// console.log('exists', exists);

// const res = await git.clone('http://192.168.50.100:3000/sobird/actions-test.git', ['--branch', 'main']);
// console.log('res', res);

// const remotes = await git.getRemotes(true);
// console.log('remotes', remotes);

// const info = GitUrlParse('https://git-codecommit.us-east-1.amazonaws.com/v1/repos/my-repo-name');
// info.user = 'sobird';
// console.log('info', info);

// const info1 = hostedGitInfo.fromUrl('http://myotherrepo.com/act.git');
// console.log('info1', info1?.shortcut());

// const res = new URL('git@github.com:nektos/act.git');
// console.log('res', res);
