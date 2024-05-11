/**
 * git.ts
 *
 * sobird<i@sobird.me> at 2024/05/11 1:46:13 created.
 */

import GitUrlParse from 'git-url-parse';
import hostedGitInfo from 'hosted-git-info';
import simpleGit, { GitError } from 'simple-git';

class Git {
  cli;

  constructor(public base: string) {
    this.cli = simpleGit(base);
  }

  async revision() {
    const shortSha = await this.cli.revparse(['--short', 'HEAD']);
    const sha = await this.cli.revparse(['HEAD']);
    return {
      shortSha,
      sha,
    };
  }

  /**
   * 获取当前 ref name
   * @returns
   */
  async refname() {
    let refTag;
    let refBranch;

    const raw = await this.cli.raw(['for-each-ref', '--format', '%(refname)']);
    const refnames = raw.trim().split('\n');

    const headSha = await this.cli.revparse('HEAD');

    for (const ref of refnames) {
      // eslint-disable-next-line no-await-in-loop
      const sha = await this.cli.revparse(ref);
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
   *
   * @param remoteName
   * @returns
   */
  async repository(remoteName?: string) {
    const remoteURL = await this.remoteURL(remoteName);
    if (!remoteURL) {
      return '';
    }
    const info = GitUrlParse(remoteURL.refs.fetch);

    return info.full_name;
  }

  async remoteURL(remoteName: string = 'origin') {
    const remotes = await this.cli.getRemotes(true);
    return remotes.find((item) => { return item.name === remoteName; });
  }

  static async Ref(gitDir: string) {
    const git = simpleGit(gitDir);
    const { current } = await git.branchLocal();
    return current;
  }

  static async Clone(repoPath: string, localPath: string) {
    const git = simpleGit(localPath);
    try {
      // const options = ['--depth', '1', '--branch', 'main'];
      await git.clone(repoPath);
    } catch (error) {
      //
    }
  }
}

export default Git;

// const git = simpleGit('/private/var/folders/0g/085cjcx1231cqqknq0k8pbzh0000gn/T/git-test/current_head_is_tag');
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
