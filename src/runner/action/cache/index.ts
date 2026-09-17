import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';

import simpleGit from 'simple-git';

import { gitCredential } from '@/common/git';
import logger from '@/common/logger';

class ActionCache {
  constructor(public dir: string = path.join(os.tmpdir(), 'actions')) {}

  async fetch(url: string, repository: string, ref: string, token?: string) {
    const repoPath = path.join(this.dir, `${repository}.git`);
    await fs.mkdir(repoPath, { recursive: true });

    // 凭据不拼进 URL，否则 `git clone --bare` 会把它写进裸库的 config，日志也会带上
    const git = simpleGit(repoPath, gitCredential(token));

    try {
      // the bare repository is reused across runs, so only clone when it is not there yet
      await git.revparse('HEAD');
    } catch {
      try {
        await git.clone(url, repoPath, ['--bare']);
      } catch (error) {
        logger.error(`Unable to clone ${repository} into ${repoPath}: ${(error as Error).message}`);
        throw error;
      }
    }

    const branchName = crypto.randomBytes(16).toString('hex');
    try {
      // the local ref of a reused repository is not updated by an explicit refspec, so resolve the
      // temporary branch the fetch just created instead of `ref`
      await git.fetch(['origin', `${ref}:${branchName}`, '--force']);
      return await git.revparse(branchName);
    } catch (error) {
      logger.error(`Unable to resolve '${ref}' in ${repository}: ${(error as Error).message}`);
      throw error;
    } finally {
      // the fetched commit is usually not an ancestor of the clone's branch, so a plain `-d` refuses to
      // drop the branch and only a force delete works; when the fetch itself failed there is no branch,
      // and neither failure is actionable here
      await git.deleteLocalBranch(branchName, true).catch(() => undefined);
    }
  }

  /**
   * Pack `subPath` as a tar stream. The second argument is the revision to pack: pass the value `fetch`
   * returned (a resolved revision, or a ref when a local folder overrides the repository), not the ref.
   */
  async archive(repository: string, ref: string, subPath: string = '.') {
    const repoPath = path.join(this.dir, `${repository}.git`);
    await fs.mkdir(repoPath, { recursive: true });

    // `git.raw` decodes stdout as utf-8, which corrupts binary tar entries, so collect the raw bytes instead.
    const chunks: Buffer[] = [];
    const git = simpleGit(repoPath).outputHandler((command, stdout) => {
      stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
    });
    subPath = path.normalize(subPath || '.');

    try {
      await git.raw(['archive', '--format=tar', ref, subPath]);
      return Readable.from(Buffer.concat(chunks));
    } catch (error) {
      logger.error(`Unable to archive ${repository}@${ref} '${subPath}': ${(error as Error).message}`);
      throw error;
    }
  }
}

export default ActionCache;
