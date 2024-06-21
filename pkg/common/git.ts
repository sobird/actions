/**
 * git.ts
 *
 * sobird<i@sobird.me> at 2024/05/11 1:46:13 created.
 */

import fs from 'node:fs';
import path from 'node:path';

import GitUrlParse from 'git-url-parse';
import log4js from 'log4js';
import simpleGit, { SimpleGitOptions } from 'simple-git';

import Executor from './executor';

export { GitError } from 'simple-git';

const logger = log4js.getLogger();

class Git {
  git;

  name: string;

  constructor(public base: string) {
    this.name = path.basename(base);
    this.git = Git.SimpleGit(base, {
      // progress({ method, stage, progress }) {
      //   console.log(`git ${method} ${stage} stage ${progress}% complete`);
      // },
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

  async clone(url: string, ref: string = 'HEAD') {
    const { git } = this;
    try {
      await git.fetch();
    } catch (err) {
      await git.clone(url, this.base);
    }

    await git.checkout(ref);

    return git;
  }

  async revision() {
    const shortsha = await this.git.revparse(['--short', 'HEAD']);
    const sha = await this.git.revparse(['HEAD']);
    return {
      shortsha,
      sha,
    };
  }

  /**
   * 获取当前 ref，形如：refs/heads/main
   *
   * @returns
   */
  async ref() {
    const { git } = this;
    let refTag;
    let refBranch;

    const raw = await git.raw(['for-each-ref', '--format', '%(refname)']);
    const refnames = raw.trim().split('\n');

    const headSha = await git.revparse('HEAD');

    for (const ref of refnames) {
      // eslint-disable-next-line no-await-in-loop
      const sha = await git.revparse(ref);
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

  static SimpleGit(basePath: string, options?: Partial<SimpleGitOptions>) {
    const baseDir = path.resolve(basePath);
    fs.mkdirSync(baseDir, { recursive: true });
    return simpleGit(baseDir, options);
  }

  static async Revision(repoPath: string) {
    const git = Git.SimpleGit(repoPath);

    const shortsha = await git.revparse(['--short', 'HEAD']);
    const sha = await git.revparse(['HEAD']);
    return {
      shortsha,
      sha,
    };
  }

  static async Ref(gitDir: string) {
    const git = Git.SimpleGit(gitDir);

    let refTag;
    let refBranch;

    const raw = await git.raw(['for-each-ref', '--format', '%(refname)']);
    const refnames = raw.trim().split('\n');

    const headSha = await git.revparse('HEAD');

    for (const ref of refnames) {
      // eslint-disable-next-line no-await-in-loop
      const sha = await git.revparse(ref);
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

    return refTag || refBranch || '';
  }

  static async Clone(url: string, localPath: string, ref: string) {
    const git = this.SimpleGit(localPath);

    try {
      await git.fetch();
    } catch (err) {
      await git.clone(url, localPath);
    }

    await git.checkout(ref);

    return git;
  }

  static CloneExecutor(url: string, localPath: string, ref: string = 'HEAD', offlineMode: boolean = false) {
    return Executor.Mutex(new Executor(async () => {
      logger.info("\u2601  git clone '%s' # ref=%s", url, ref);
      logger.debug('cloning %s to %s', url, localPath);

      const git = await this.Clone(url, localPath, ref);

      if (!offlineMode) {
        git.pull();
      }
    }));
  }
}

export default Git;

// const testTmp = path.join(os.tmpdir(), 'git-test');
// Git.Clone('https://github.com/sobird/actions-test', testTmp, 'main');
// console.log('testTmp', testTmp);
// const git = new Git(testTmp);
// await git.clone('https://github.com/sobird/actions-test.git', 'test');
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
