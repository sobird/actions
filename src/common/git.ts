/**
 * Git Client
 *
 * sobird<i@sobird.me> at 2024/05/11 1:46:13 created.
 */

import fs from 'node:fs';
import path from 'node:path';

import GitUrlParse from 'git-url-parse';
import simpleGit, { SimpleGitOptions, CheckRepoActions } from 'simple-git';

import logger from '@/common/logger';

import Executor from './executor';

/**
 * 凭据只经 credential helper 交给 git，不写进 URL：URL 会被 `git clone` 落到 `.git/config`、
 * 被打进日志，git 自己的报错也会把它原样回显。git 只在服务端发起认证质询时才调用 helper，
 * 所以公开仓库仍旧是匿名拉取。
 *
 * 这里的 `-c` 是命令行配置，simple-git 把它放在子命令之前，不会进新仓库的 `.git/config`。
 * 代价是 token 出现在 git 进程的 argv 里，同机其他用户 `ps` 就能看到，适合单用户或容器内运行。
 */
export function gitCredential(token?: string) {
  if (!token) {
    return undefined;
  }

  // token 要拼进一段交给 shell 执行的脚本，带引号或 `$` 会破坏脚本甚至被执行，先做 shell 引用
  const password = `'${token.replaceAll("'", `'\\''`)}'`;

  return {
    config: [
      // 先置空一次以清掉用户全局配置里的其它 helper，免得它们抢先应答同一个 host
      'credential.helper=',
      `credential.helper=!f() { test "$1" = get && { echo username=token; printf 'password=%s\\n' ${password}; }; }; f`,
    ],
    // simple-git 默认拦下 credential.helper：`!`-helper 等价于让 git 执行一段 shell 脚本。
    // 脚本结构固定，唯一插进去的 token 已做 shell 引用，所以显式开这个开关。
    unsafe: { allowUnsafeCredentialHelper: true },
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
    this.git = Git.SimpleGit(dir, {
      // progress({ method, stage, progress }) {
      //   console.log(`git ${method} ${stage} stage ${progress}% complete`);
      // },
      ...gitCredential(token),
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

  /**
   * 确认 dir 里是一个能用的仓库，没有就克隆，返回 simple-git 实例。
   *
   * dir 已经按 host 分片（见 hostOf），同一个目录必然对应同一个来源，所以这里不再比对 origin。
   */
  private async ensureRepo(url: string, bare: boolean) {
    const { git, dir } = this;

    // checkIsRepo() 默认查 `--is-inside-work-tree`，裸库里恒为 false，必须换成 `--is-bare-repository`
    if (!(await git.checkIsRepo(bare ? CheckRepoActions.BARE : undefined))) {
      try {
        await git.clone(url, dir, bare ? ['--bare'] : undefined);
      } catch (error) {
        // 不能只记日志：克隆失败后继续走到 checkout，只会抛出一个离现场很远的次生错误
        throw new Error(`Unable to clone ${redactUrl(url)}: ${(error as Error).message}`, { cause: error });
      }
    }

    return git;
  }

  async clone(url: string, ref: string = 'HEAD') {
    const git = await this.ensureRepo(url, false);
    await git.checkout(ref);
    return git;
  }

  /** 克隆或复用裸库，供 action 缓存按 ref 取提交用 */
  async cloneBare(url: string) {
    return this.ensureRepo(url, true);
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
