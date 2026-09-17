import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';

import * as tar from 'tar';

import ActionCache from '.';

class ActionCacheRepository extends ActionCache {
  cacheDirCache: Record<string, string> = {};

  constructor(
    dir: string = path.join(os.tmpdir(), 'actions'),
    public repositories: Record<string, string> = {},
  ) {
    super(dir);
  }

  async fetch(url: string, repository: string, ref: string = 'HEAD', token?: string) {
    const key = `${url}@${ref}`;
    if (this.repositories[key]) {
      this.cacheDirCache[`${repository}@${ref}`] = this.repositories[key];
      return ref;
    }

    try {
      const repoURL = new URL(url);
      const pathKey = `${repoURL.pathname.substring(1)}@${ref}`;
      if (this.repositories[pathKey]) {
        this.cacheDirCache[`${repository}@${ref}`] = this.repositories[pathKey];
        return ref;
      }
    } catch {
      // Handle URL parsing error
    }

    return super.fetch(url, repository, ref, token);
  }

  async archive(repository: string, ref: string, subPath: string = '.') {
    const repositoryKey = `${repository}@${ref}`;
    const localDir = this.cacheDirCache[repositoryKey];
    if (localDir) {
      // mirror `git archive --format=tar <ref> <subPath>`: pack from the repository root so the entries keep
      // the sub path, which is what a single file path and a directory path are both expected to produce
      return tar.create({ portable: true, cwd: localDir }, [path.normalize(subPath || '.')]) as unknown as Readable;
    }
    return super.archive(repository, ref, subPath);
  }
}

export default ActionCacheRepository;
