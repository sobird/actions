/**
 * git.ts
 *
 * sobird<i@sobird.me> at 2024/05/11 1:46:13 created.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
// import tty from 'node:tty';

import GitUrlParse from 'git-url-parse';
import simpleGit, { SimpleGitOptions } from 'simple-git';

import logger from '@/common/logger';

import Executor from './executor';

export { GitError } from 'simple-git';

// const isatty = tty.isatty(process.stdout.fd);

const credentialDirs = new Set<string>();

process.once('exit', () => {
  credentialDirs.forEach((dir) => fs.rmSync(dir, { recursive: true, force: true }));
});

/**
 * 凭据只经 credential helper 交给 git，不写进 URL：URL 会被 `git clone` 落到 `.git/config`、
 * 被打进日志，git 自己的报错也会把它原样回显。git 只在服务端发起认证质询时才调用 helper，
 * 所以公开仓库仍旧是匿名拉取。
 *
 * 不走环境变量是因为 simple-git 会扫描我们传给 git 的环境，命中 `PAGER`、`GIT_*` 这类变量
 * 就直接拒发命令，而完整继承 `process.env`（PATH、代理、`SSH_AUTH_SOCK`）是必需的。
 * 于是把凭据写进一个 0600 的临时文件，脚本本身不含密钥。
 */
export function gitCredential(token?: string) {
  if (!token) {
    return undefined;
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'actions-git-credential-'));
  const tokenFile = path.join(dir, 'token');
  fs.writeFileSync(tokenFile, token, { mode: 0o600 });
  credentialDirs.add(dir);

  return {
    options: {
      config: [
        // 先置空一次以清掉用户全局配置里的其它 helper，免得它们抢先应答同一个 host
        'credential.helper=',
        `credential.helper=!f() { test "$1" = get && { echo username=token; echo "password=$(cat ${tokenFile})"; }; }; f`,
      ],
      // simple-git 默认拦下 credential.helper：`!`-helper 等价于让 git 执行一段 shell 脚本。
      // 这段脚本里没有外部输入，密钥只从上面那个 0600 文件读，所以显式开这个开关。
      unsafe: { allowUnsafeCredentialHelper: true },
    },
  };
}

/** 打日志前去掉 url 里的凭据，只留下主机和路径。 */
export function redactUrl(url: string) {
  try {
    const parsed = new URL(url);
    parsed.username = '';
    parsed.password = '';
    return parsed.toString();
  } catch {
    return url;
  }
}

class Git {
  git;

  constructor(
    public dir: string,
    token: string = '',
  ) {
    const credential = gitCredential(token);
    this.git = Git.SimpleGit(dir, {
      // progress({ method, stage, progress }) {
      //   console.log(`git ${method} ${stage} stage ${progress}% complete`);
      // },
      ...credential?.options,
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

  async clone(url: string, ref: string = 'HEAD') {
    const { git, dir } = this;

    if (await git.checkIsRepo()) {
      /* 目录里有仓库不代表它就是我们想 clone 的那个：GHE 会把 uses.url 换成 github.com
       * （见 action/remote.ts 里的 replaceGheActionWithGithubCom），而缓存目录只按
       * repository/ref 分片，所以同一个目录可能是别的主机克隆出来的。对不上就删掉重来。
       */
      const origin = await this.remoteURL();
      if (origin && origin !== url) {
        logger.warn(`🍭 Re-cloning ${dir}, origin '${redactUrl(origin)}' is not '${redactUrl(url)}'`);
        fs.rmSync(dir, { recursive: true, force: true });
        // simple-git 的子进程以 dir 为工作目录，删掉之后必须先建回来
        fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
      }
    }

    if (!(await git.checkIsRepo())) {
      try {
        await git.clone(url, dir);
      } catch (error) {
        // 不能只记日志：克隆失败后继续走到 checkout，只会抛出一个离现场很远的次生错误
        throw new Error(`Unable to clone ${redactUrl(url)}@${ref}: ${(error as Error).message}`, { cause: error });
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
    } catch {
      return '';
    }
  }

  /**
   * get the current git ref, example: refs/heads/main
   */
  async ref() {
    const rev = await this.revision();
    if (!rev) {
      return '';
    }

    logger.debug(`🍭 HEAD points to '${rev}'`);

    let refTag = '';
    let refBranch = '';

    // 一次取回全部 ref 及其提交，避免为每个 ref 各起一次 revparse 子进程
    const refs = (await this.git.raw(['for-each-ref', '--format', '%(refname) %(objectname)'])).trim();

    for (const line of refs.split('\n')) {
      const [ref, sha] = line.trim().split(' ');

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
    return (await this.git.getRemotes(true)).find((remote) => {
      return remote.name === remoteName;
    })?.refs.fetch;
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

  static async Clone(dir: string, url: string, ref: string = 'HEAD', token: string = '') {
    return new Git(dir, token).clone(url, ref);
  }

  static CloneExecutor(
    dir: string,
    url: string,
    ref: string = 'HEAD',
    token: string = '',
    offlineMode: boolean = false,
  ) {
    return Executor.Mutex(
      new Executor(async () => {
        const safeUrl = redactUrl(url);
        logger.info(`🍭 Git clone '${safeUrl}' # ref=${ref}`);
        logger.debug(`🍭 Cloning ${safeUrl} to ${dir}`);

        const git = await this.Clone(dir, url, ref, token);

        if (!offlineMode) {
          const { updated } = await git.fetch();
          if (updated.length === 0) {
            return;
          }
          await git.pull(['--force']);
        }

        logger.debug(`🍭 Cloned ${safeUrl} to ${dir}`);
      }),
    );
  }
}

export default Git;
