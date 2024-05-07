import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import { join } from 'node:path';

import simpleGit, { GitError } from 'simple-git';

import { safeFilename } from '@/utils';

class ActionCache {
  constructor(public base: string) {}

  async fetch(path: string, url: string, ref: string, token?: string) {
    const gitPath = join(this.base, `${safeFilename(path)}.git`);
    fs.mkdirSync(gitPath, { recursive: true });
    const git = simpleGit({ baseDir: gitPath });

    const commit = await git.revparse([ref]);

    try {
      await git.init();
      await git.addRemote('origin', url);
    } catch (err) {
      if ((err as GitError).message.includes('already exists')) {
        // 忽略已存在的仓库错误
      } else {
        // throw err;
      }
    }

    const auth = token ? `token:${token}` : '';
    await git.fetch(auth);

    const branchName = randomBytes(16).toString('hex');
    await git.checkout(['-b', branchName, commit]);

    return commit;
  }

  async archive(path: string, sha: string, prefix?: string) {
    const gitPath = join(this.base, `${safeFilename(path)}.git`);
    const git = simpleGit({ baseDir: gitPath });
    const commit = await git.revparse([sha]);

    const tarballPath = join(gitPath, 'tarball.tar.gz');

    const args = ['archive', '--output', tarballPath, commit];

    if (prefix) {
      args.push(`--prefix=${prefix}`);
    }

    await git.raw(args);

    return fs.createReadStream(tarballPath);
  }
}

export default ActionCache;
