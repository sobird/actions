import path from 'node:path';

import simpleGit from 'simple-git';

import ActionCache from '.';

class ActionCacheOffline extends ActionCache {
  async fetch(url: string, repository: string, ref: string, token?: string) {
    const sha = await super.fetch(url, repository, ref, token);

    const gitPath = path.join(this.dir, `${repository}.git`);
    const git = simpleGit(gitPath);

    const refName = `refs/action-cache-offline/${ref}`;

    const refs = (await git.listRemote(['--quiet', '--refs', '.', refName])).trim().split('\t').filter(Boolean);
    const [hash] = refs;

    if (refs.length === 0 || sha !== hash) {
      await git.raw(['update-ref', refName, sha]);
    }

    if (refs.length > 0) {
      return hash;
    }

    return sha;
  }
}

export default ActionCacheOffline;
