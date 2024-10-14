/**
 * step remote uses
 *
 * @see @/pkg/workflow/job/job-reusable-workflow.ts
 *
 * sobird<i@sobird.me> at 2024/05/21 16:20:47 created.
 */

import Executor from '@/pkg/common/executor';

import StepAction from './step-action';

interface Reusable {
  url: string;
  owner: string;
  repo: string;
  repository: string;
  dir: string;
  ref: string;
}

class StepActionRemote extends StepAction {
  public pre() {
    return new Executor(async (runner) => {
      const { uses = '' } = this;

      const reusable: Reusable = {
        url: '',
        owner: '',
        repo: '',
        repository: '',
        dir: '',
        ref: '',
      };

      const matches = /^(https?:\/\/[^/?#]+\/)?([^/@]+)(?:\/([^/@]+))?(?:\/([^@]*))?(?:@(.*))?$/.exec(uses);
      if (matches) {
        const [,url, owner, repo, dir, ref] = matches;
        reusable.url = url || 'https://gitea.com' || runner!.context.github.server_url;
        reusable.owner = owner;
        reusable.repo = repo;
        reusable.repository = `${owner}/${repo}`;
        reusable.dir = dir;
        reusable.ref = ref;
      }

      console.log('reusable', reusable);
      return;

      try {
        const url = new URL(reusable.repository, reusable.url);

        if (runner!.Token) {
          url.username = 'token';
          url.password = runner!.Token;
        }

        reusable.url = url.toString();
      } catch (err) {
        //
      }

      console.log('step uses reusable', reusable, uses);

      const { actionCache } = runner!.config;

      if (actionCache) {
        await actionCache.fetch(reusable.url, reusable.repository, reusable.ref);
        const archive = await actionCache.archive(reusable.repository, reusable.ref);
        // console.log('archive', archive);
      }
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
