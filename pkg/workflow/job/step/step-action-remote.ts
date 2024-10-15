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
import Action from '@/pkg/runner/action';
import Reusable from '@/pkg/workflow/reusable';
import { readEntry } from '@/utils/tar';

import StepAction from './step-action';

class StepActionRemote extends StepAction {
  action?: Action;

  public pre() {
    return new Executor((runner) => {
      const reusable = new Reusable(this.uses, runner?.Token);
      const { repository, sha, server_url: serverUrl } = runner!.context.github;
      reusable.url = reusable.url || serverUrl;

      if (reusable.isLocal) {
        if (runner!.config.skipCheckout) {
          return this.reusableActionExecutor(reusable.path);
        }
        reusable.repository = repository;
        reusable.ref = sha;
      }

      console.log('reusable - step', reusable);
      console.log('repositoryUrl', reusable.repositoryUrl);

      if (runner?.config.actionCache) {
        return this.actionCacheReusableActionExecutor(reusable);
      }

      const repositoryDir = path.join(runner!.ActionCacheDir, reusable.repository, reusable.ref);
      const actionDir = path.join(repositoryDir, reusable.path);
      return Git.CloneExecutor(repositoryDir, reusable.repositoryUrl, reusable.ref).finally(this.reusableActionExecutor(actionDir));
    });
  }

  public main() {
    return this.executor(new Executor(() => {
      console.log('this.uses', this.action);

      return this.action?.executor();
    }));
  }

  public post() {
    return new Executor(() => {});
  }

  reusableActionExecutor(actionPath: string) {
    return new Executor(async (runner) => {
      this.action = Action.Scan(actionPath);
      console.log('this.action', this.action);
    });
  }

  actionCacheReusableActionExecutor(reusable: Reusable) {
    return new Executor(async (runner) => {
      console.log('actionCacheReusableActionExecutor: ');
      const { actionCache } = runner!.config;
      if (actionCache) {
        await actionCache.fetch(reusable.repositoryUrl, reusable.repository, reusable.ref);
        const archive = await actionCache.archive(reusable.repository, reusable.ref, 'action.yml1');
        const entry = await readEntry(archive);
        console.log('entry', entry);

        // const action = Action.Scan(actionPath);
        // console.log('action', action)
      }
    });
  }
}

export default StepActionRemote;
