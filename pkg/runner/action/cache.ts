import fs from 'node:fs';
import path from 'node:path';

import simpleGit from 'simple-git';
import * as tar from 'tar';

class ActionCache {
  constructor(public dir: string) {}

  async fetch(url: string, repository: string, ref: string) {
    const repoPath = path.join(this.dir, repository);
    fs.mkdirSync(repoPath, { recursive: true });
    const git = simpleGit(repoPath);

    try {
      await git.status();
      await git.fetch();
    } catch (err) {
      const options = ['--recurse-submodules'];
      await git.clone(url, repoPath, options);
    }

    await git.checkout(ref);

    return git.revparse(ref);
  }

  async archive(repository: string, ref: string, includePrefix: string = '') {
    const repoPath = path.join(this.dir, repository);
    fs.mkdirSync(repoPath, { recursive: true });
    const git = simpleGit(repoPath);

    const commit = await git.revparse(ref);
    const files = (await git.raw(['ls-tree', '-r', '--name-only', commit])).split('\n').filter((file) => {
      return file.startsWith(includePrefix);
    });

    const pack = tar.c({ cwd: repoPath }, files);

    return pack;
  }

  // git(repository: string) {
  //   const repoPath = path.join(this.dir, repository);
  //   fs.mkdirSync(repoPath, { recursive: true });
  //   return simpleGit(repoPath);
  // }
}

export default ActionCache;
