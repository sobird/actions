/**
 * git.ts
 *
 * sobird<i@sobird.me> at 2024/05/11 1:46:13 created.
 */

import fs from 'node:fs';
import path from 'node:path';
import tty from 'node:tty';

import GitUrlParse from 'git-url-parse';
import log4js from 'log4js';
import simpleGit, { SimpleGitOptions } from 'simple-git';

import Executor from './executor';

export { GitError } from 'simple-git';

const logger = log4js.getLogger();
const isatty = tty.isatty(process.stdout.fd);

class Git {
  git;

  constructor(public dir: string) {
    this.git = Git.SimpleGit(dir, {
      // progress({ method, stage, progress }) {
      //   console.log(`git ${method} ${stage} stage ${progress}% complete`);
      // },
    });
  }

  async firstLog() {
    return this.git.log([await this.git.firstCommit()]);
  }

  async author() {
    const { git } = this;
    const gitUsername = (await git.getConfig('user.name')).value;
    const logUsername = (await git.log(['-n', '1'])).latest?.author_name;

    return logUsername || gitUsername;
  }

  async fileSha(filename: string) {
    return (await this.git.log(['--pretty=%H', '-1', filename])).latest?.hash;
  }

  async clone(url: string, ref: string = 'HEAD', token?: string) {
    const { git, dir } = this;

    try {
      const repoURL = new URL(url);
      if (token) {
        repoURL.username = 'token';
        repoURL.password = token;
      }
      // eslint-disable-next-line no-param-reassign
      url = repoURL.toString();
    } catch (err) {
      //
    }

    try {
      await git.revparse('HEAD');
    } catch (err) {
      try {
        await git.clone(url, dir);
      } catch (error) {
        logger.error('Unable to clone %s %s: %s', url, ref, (error as Error).message);
      }
    }

    await git.checkout(ref);
    return git;
  }

  /**
   * get the current git revision
   */
  async revision() {
    try {
      return await this.git.revparse(['HEAD']);
    } catch (err) {
      return '';
    }
  }

  /**
   * 获取当前 ref，形如：refs/heads/main
   *
   * @returns
   */
  async ref() {
    const rev = await this.revision();
    if (!rev) {
      return '';
    }

    logger.debug("HEAD points to '%s'", rev);

    const { git } = this;
    let refTag = '';
    let refBranch = '';

    const refs = (await git.raw(['for-each-ref', '--format', '%(refname)'])).trim().split('\n');

    for await (const ref of refs) {
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
      if (sha === rev) {
        if (ref.startsWith('refs/tags')) {
          refTag = ref;
        }
        if (ref.startsWith('refs/heads')) {
          refBranch = ref;
        }
      }

      if (refTag && refBranch) {
        break;
      }
    }

    return refTag || refBranch;
  }

  async repoInfo(remoteName?: string) {
    const remoteURL = await this.remoteURL(remoteName);
    if (!remoteURL) {
      // 认为第一条提交的用户为owner
      const { latest } = await this.firstLog();
      const owner = latest?.author_name;
      const name = path.basename(this.dir);
      return {
        owner,
        name,
        repository: `${owner}/${name}`,
        url: '',
      };
    }

    const { owner, name, full_name: repository } = GitUrlParse(remoteURL);

    return {
      owner,
      name,
      repository,
      url: remoteURL,
    };
  }

  async remoteURL(remoteName: string = 'origin') {
    return (await this.git.getRemotes(true)).find((remote) => { return remote.name === remoteName; })?.refs.fetch;
  }

  static SimpleGit(basePath: string, options?: Partial<SimpleGitOptions>) {
    const baseDir = path.resolve(basePath);
    fs.mkdirSync(baseDir, { recursive: true, mode: 0o755 });
    return simpleGit(baseDir, options);
  }

  static async Revision(dir: string) {
    return new Git(dir).revision();
  }

  static async Ref(gitDir: string) {
    return new Git(gitDir).ref();
  }

  static async Clone(dir: string, url: string, ref: string = 'HEAD', token?: string) {
    return new Git(dir).clone(url, ref, token);
  }

  static CloneExecutor(dir: string, url: string, ref: string = 'HEAD', offlineMode: boolean = false) {
    return Executor.Mutex(new Executor(async () => {
      logger.info("\u2601  git clone '%s' # ref=%s", url, ref);
      logger.debug('cloning %s to %s', url, dir);

      const git = await this.Clone(dir, url, ref);

      if (!offlineMode) {
        const { updated } = await git.fetch();
        console.log('updated', updated);
        if (updated.length === 0) {
          // return;
        }
      }

      let hash = await git.revparse(ref);
      console.log('hash', hash);

      if (hash !== ref && ref.startsWith(hash)) {
        throw new Error('Short ref error');
      }

      let refType = 'tag';
      const { all } = await git.tags([ref]);
      if (all.length === 0) {
        refType = 'branch';
        await git.checkout([ref]);
      }

      if (hash !== ref && refType === 'branch') {
        logger.debug('Provided ref is not a sha. Checking out branch before pulling changes');
        await git.checkout(`origin/${ref}`);
      }

      logger.debug('Cloned %s to %s', url, dir);

      if (hash !== ref && refType === 'branch') {
        logger.debug('Provided ref is not a sha. Updating branch ref after pull');
        hash = await git.revparse(ref);
      }
      console.log('hash12', hash);
      await git.checkout(hash);
      await git.reset(['--hard', hash]);

      logger.debug(`Checked out ${ref}`);
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
