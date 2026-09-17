import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';

import * as tar from 'tar';

import ActionCache from '.';

/**
 * 把 `--repositories` 映射到本地目录的仓库直接当缓存用：命中就返回 ref（fetch 的返回值在
 * archive 里被当成 sha 用），没命中交给 parent。act 的 `LocalRepositoryCache` 同形。
 */
class ActionCacheRepository extends ActionCache {
  cacheDirCache: Record<string, string> = {};

  constructor(
    dir: string = path.join(os.tmpdir(), 'actions'),
    public repositories: Record<string, string> = {},
    private parent: ActionCache = new ActionCache(dir),
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

    return this.parent.fetch(url, repository, ref, token);
  }

  async archive(url: string, repository: string, ref: string, subPath: string = '.') {
    const repositoryKey = `${repository}@${ref}`;
    const localDir = this.cacheDirCache[repositoryKey];
    if (localDir) {
      // mirror `git archive --format=tar <ref> <subPath>`: pack from the repository root so the entries keep
      // the sub path, which is what a single file path and a directory path are both expected to produce
      return tar.create({ portable: true, cwd: localDir }, [path.normalize(subPath || '.')]) as unknown as Readable;
    }
    return this.parent.archive(url, repository, ref, subPath);
  }
}

export default ActionCacheRepository;
