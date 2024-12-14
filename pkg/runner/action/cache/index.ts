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

  async archive(repository: string, ref: string, prefix: string = '.') {
    const repoPath = path.join(this.dir, `${repository}.git`);
    fs.mkdirSync(repoPath, { recursive: true });
    const git = simpleGit(repoPath);

    const commit = await git.revparse(ref);
    const cleanPrefix = path.normalize(prefix || '.');

    const files = (await git.raw(['ls-tree', '-r', '--name-only', commit, cleanPrefix])).split('\n').filter(Boolean);

    let count = 0;
    const pack = new tar.Pack({ portable: true });
    files.forEach((file) => {
      git.show(`${commit}:${file}`, (err, content) => {
        if (err) {
          return;
        }
        const buffer = Buffer.from(content);
        const header = new tar.Header({
          path: file,
          size: buffer.byteLength,
          mtime: new Date(),
        });
        header.encode();
        const entry = new tar.ReadEntry(header);
        entry.end(buffer);
        pack.add(entry);

        count += 1;
        if (count === files.length) {
          pack.end();
        }
      });
    });

    if (files.length === 0) {
      pack.end();
    }

    return pack as unknown as NodeJS.ReadableStream;
  }
}

export default ActionCache;
