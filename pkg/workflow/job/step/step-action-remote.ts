/**
 * step remote uses
 *
 * @see @/pkg/workflow/job/job-reusable-workflow.ts
 *
 * sobird<i@sobird.me> at 2024/05/21 16:20:47 created.
 */
import path from 'node:path';

import Executor from '@/pkg/common/executor';
import Git from '@/pkg/common/git';
import Reusable from '@/pkg/workflow/reusable';

import StepAction from './step-action';

class StepActionRemote extends StepAction {
  public pre() {
    return new Executor(async (runner) => {
      const reusable = new Reusable(this.uses, runner?.Token);
      const { repository, sha, server_url: serverUrl } = runner!.context.github;
      reusable.url = reusable.url || serverUrl;

      if (reusable.isLocal) {
        if (runner!.config.skipCheckout) {
          //
          return;
        }
        reusable.repository = repository;
        reusable.ref = sha;
      }

      console.log('reusable - step', reusable);
      console.log('repositoryUrl', reusable.repositoryUrl);

      // const { actionCache } = runner!.config;
      // if (actionCache) {
      //   await actionCache.fetch(reusable.url, reusable.repository, reusable.ref);
      //   const archive = await actionCache.archive(reusable.repository, reusable.ref);
      //   console.log('archive', archive);
      // }

      const repositoryDir = path.join(runner!.ActionCacheDir, reusable.repository, reusable.ref);
      return Git.CloneExecutor(repositoryDir, reusable.repositoryUrl, reusable.ref);
    });
  }

  public main() {
    return this.executor(new Executor(() => {
      console.log('this.uses', this.uses);
    }));
  }

  public post() {
    return new Executor(() => {});
  }

  static ParseUses(uses: string) {
    const matches = /^(https?:\/\/[^/?#]+\/)?([^/@]+)(?:\/([^/@]+))?(?:\/([^@]*))?(?:@(.*))?$/.exec(uses);
    if (matches) {
      const [,url, owner, repo, dir, ref] = matches;
      return {
        url, owner, repo, dir, ref,
      };
    }
    // todo throw Error
  }
}

export default StepActionRemote;
