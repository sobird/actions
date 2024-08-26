import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import simpleGit from 'simple-git';
import * as tar from 'tar';

class ActionCache {
  constructor(public dir: string = path.join(os.tmpdir(), 'actions')) {}

  async fetch(url: string, repository: string, ref: string, token?: string) {
    const repoPath = path.join(this.dir, `${repository}.git`);
    fs.mkdirSync(repoPath, { recursive: true });
    const git = simpleGit(repoPath);

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
      await git.clone(url, repoPath, ['--bare']);
    } catch (err) {
      //
    }

    const branchName = crypto.randomBytes(16).toString('hex');

    try {
      await git.fetch(['origin', `${ref}:${branchName}`, '--force']);
    } catch (err) {
      return '';
    }

    const hash = await git.revparse(ref);
    git.deleteLocalBranch(branchName);
    return hash;
  }

  async archive(repository: string, ref: string, includePrefix: string = '') {
    const repoPath = path.join(this.dir, `${repository}.git`);
    fs.mkdirSync(repoPath, { recursive: true });
    const git = simpleGit(repoPath);

    const commit = await git.revparse(ref);
    const pack = new tar.Pack({ portable: true });
    (await git.raw(['ls-tree', '-r', '--name-only', commit])).split('\n').forEach((file) => {
      if (file.startsWith(includePrefix)) {
        git.show(`${commit}:${file}`, (err, show) => {
          if (err) throw err;
          const content = Buffer.from(show);
          const header = new tar.Header({
            path: file,
            mode: 0o644,
            size: content.byteLength,
            mtime: new Date(),
          });
          header.encode();
          const entry = new tar.ReadEntry(header);
          entry.end(content);
          pack.add(entry);
        });
      }
    });

    return pack;
  }
}

export default ActionCache;
