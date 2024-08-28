import path from 'node:path';

import * as tar from 'tar';

import ActionCache from '.';

class ActionCacheRepository extends ActionCache {
  cacheDirCache: Record<string, string> = {};

  constructor(
    dir: string,
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
    } catch (err) {
      // Handle URL parsing error
    }

    return super.fetch(url, repository, ref, token);
  }

  async archive(repository: string, ref: string, prefix: string = '.') {
    const repositoryKey = `${repository}@${ref}`;
    if (this.cacheDirCache[repositoryKey]) {
      const file = path.join(this.cacheDirCache[repositoryKey], prefix);
      return tar.create({ portable: true, cwd: file }, ['']) as unknown as NodeJS.ReadableStream;
    }
    return super.archive(repository, ref, prefix) as unknown as NodeJS.ReadableStream;
  }
}

export default ActionCacheRepository;
