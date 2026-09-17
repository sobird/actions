import path from 'node:path';

import simpleGit from 'simple-git';

import ActionCache from '.';

class ActionCacheOffline extends ActionCache {
  async fetch(url: string, repository: string, ref: string, token?: string) {
    const gitPath = path.join(this.dir, `${repository}.git`);
    const refName = `refs/action-cache-offline/${ref}`;

    let sha = '';
    let fetchError: Error | undefined;
    try {
      sha = await super.fetch(url, repository, ref, token);
    } catch (error) {
      fetchError = error as Error;
    }

    let recorded = '';
    try {
      // the bare repository is absent when the very first fetch never got to create it
      const fields = (await simpleGit(gitPath).listRemote(['--quiet', '--refs', '.', refName])).trim().split('\t');
      // ls-remote prints `<sha>\t<ref>`
      recorded = fields.find(Boolean) || '';
    } catch {
      recorded = '';
    }

    if (!fetchError) {
      // remember what the ref resolved to, so a later run can fall back to it
      if (recorded !== sha) {
        await simpleGit(gitPath).raw(['update-ref', refName, sha]);
      }
      return sha;
    }

    if (recorded) {
      return recorded;
    }

    throw fetchError;
  }
}

export default ActionCacheOffline;
