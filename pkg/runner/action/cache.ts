import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import simpleGit from 'simple-git';
import * as tar from 'tar';

class ActionCache {
  constructor(public dir: string = path.join(os.tmpdir(), 'actions')) {}

  async fetch(url: string, repository: string, ref: string) {
    const repoPath = path.join(this.dir, repository);
    fs.mkdirSync(repoPath, { recursive: true });
    const git = simpleGit(repoPath);

    try {
      await git.fetch();
    } catch (err) {
      await git.clone(url, repoPath);
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

    return tar.create({ cwd: repoPath }, files);
  }
}

export default ActionCache;
