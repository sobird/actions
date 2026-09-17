import simpleGit from 'simple-git';

import ActionCache, { repositoryPath } from '.';

/**
 * 离线模式：裸库的 `refs/action-cache-offline/<ref>` 上记着某个 (host, repo, ref) 上次解析出的
 * sha 时就直接用它，完全不联网；没有记录才拉一次并记下来。所以缓存过之后内容就固定在首次拉到的
 * 那个提交上，不会再去更新——这正是 `--actions-offline` 的「有内容就不再 fetch/pull」。
 *
 * 装饰器而不是替换，可以叠在别的 ActionCache 上，act 的 `GoGitActionCacheOfflineMode` 也是这么装的。
 */
class ActionCacheOffline extends ActionCache {
  constructor(
    dir?: string,
    private inner: ActionCache = new ActionCache(dir),
  ) {
    super(dir);
  }

  async fetch(url: string, repository: string, ref: string, token?: string) {
    const gitPath = repositoryPath(this.dir, url, repository);
    const refName = `refs/action-cache-offline/${ref}`;

    // 裸库还不存在（simpleGit() 会同步抛）、或这个 ref 从没记过（--verify --quiet 以非零退出且不打印）
    // 都当没记录。第一次跑必然走到这里，所以不能让它抛出去。
    let recorded = '';
    try {
      recorded = await simpleGit(gitPath).revparse(['--verify', '--quiet', refName]);
    } catch {
      recorded = '';
    }

    if (recorded) {
      return recorded;
    }

    const sha = await this.inner.fetch(url, repository, ref, token);
    try {
      await simpleGit(gitPath).raw(['update-ref', refName, sha]);
    } catch {
      // 只是留给下次离线用的便签，写不进去（并发跑同一个 action 争 ref 锁、ref 名不是合法 ref）
      // 不该让这次已经成功的 fetch 变成失败
    }

    return sha;
  }

  async archive(url: string, repository: string, ref: string, subPath: string = '.') {
    return this.inner.archive(url, repository, ref, subPath);
  }
}

export default ActionCacheOffline;
