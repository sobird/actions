import fs from 'node:fs';
import path from 'node:path';

import simpleGit from 'simple-git';

import ActionCache from '.';

class ActionCacheOffline {
  constructor(public parent: ActionCache) {}

  async fetch(url: string, repository: string, ref: string) {
    // 尝试从父类获取 SHA
    const sha = await this.parent.fetch(url, repository, ref);

    // 打开本地 git 仓库
    const gitPath = path.join(this.parent.dir, repository);
    fs.mkdirSync(gitPath, { recursive: true });
    console.log('gitPath', gitPath);
    const git = simpleGit(gitPath);

    // 检查是否存在对应的引用
    const refName = `refs/action-cache-offline/${ref}`;
    try {
      const localSha = await git.revparse([refName]);
      console.log('localSha', localSha);
      return localSha;
    } catch (err) {
      // console.log('err', err);
      await git.addConfig('user.name', 'cache-bot');
      await git.addConfig('user.email', 'cache-bot@example.com');
      // await git.addRemote('origin', url);
      await git.fetch();
      await git.checkout([ref]);
      await git.raw(['update-ref', ref, sha]);

      console.log('sha', sha);

      return sha;
    }
  }

  async archive(repository: string, ref: string, includePrefix: string) {
    return this.parent.archive(repository, ref, includePrefix);
  }
}

export default ActionCacheOffline;
