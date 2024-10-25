/**
 * step remote uses
 *
 * @see @/pkg/workflow/job/job-reusable-workflow.ts
 *
 * sobird<i@sobird.me> at 2024/05/21 16:20:47 created.
 */

import path from 'node:path';

import Constants from '@/pkg/common/constants';
import Executor from '@/pkg/common/executor';
import Git from '@/pkg/common/git';
import Reusable from '@/pkg/workflow/reusable';

import StepAction from '.';

class StepActionRemote extends StepAction {
  // Prepare Action Instance
  public pre() {
    return new Executor((ctx) => {
      const runner = ctx!;
      const reusable = new Reusable(this.uses, runner.Token);
      const { server_url: serverUrl } = runner!.context.github;
      reusable.url = 'https://gitea.com' || reusable.url || serverUrl;

      if (reusable.is('actions', 'checkout') && runner.config.skipCheckout) {
        //
      }

      console.log('reusable - step', reusable);
      console.log('repositoryUrl', reusable.repositoryUrl);

      const replaceGheActionWithGithubCom = runner.config.replaceGheActionWithGithubCom || [];
      replaceGheActionWithGithubCom.forEach((action) => {
        if (reusable.repository === action) {
          reusable.url = 'https://github.com';
          reusable.token = runner.config.replaceGheActionTokenWithGithubCom;
        }
      });

      if (!runner.config.actionCache) {
        return this.actionCacheReusableActionExecutor(reusable);
      }

      const repositoryDir = path.join(runner.ActionCacheDir, reusable.repository, reusable.ref);
      return Git.CloneExecutor(repositoryDir, reusable.repositoryUrl, reusable.ref).finally(this.reusableActionExecutor(reusable));
    });
  }

  public main() {
    return this.executor(new Executor(() => {
      return this.action?.main();
    }));
  }

  public post() {
    return new Executor(() => {
      return this.action?.post();
    });
  }

  reusableActionExecutor(reusable: Reusable) {
    return new Executor(async (ctx) => {
      const runner = ctx!;

      const repositoryDir = path.join(runner.ActionCacheDir, reusable.repository, reusable.ref);
      const actionLocalDir = path.join(repositoryDir, reusable.path);

      const actionDir = path.join(Constants.Directory.Actions, reusable.repository, reusable.ref);

      const exe = runner.container?.put(actionDir, actionLocalDir);
      await exe?.execute();

      return this.LoadAction(actionDir);
    });
  }

  actionCacheReusableActionExecutor(reusable: Reusable) {
    return new Executor(async (ctx) => {
      const runner = ctx!;

      const { actionCache } = runner.config;
      if (actionCache) {
        await actionCache.fetch(reusable.repositoryUrl, reusable.repository, reusable.ref);
        const archive = await actionCache.archive(reusable.repository, reusable.ref, '.');

        const actionDir = path.join(Constants.Directory.Actions, reusable.repository, reusable.ref);

        await runner.container?.putArchive(actionDir, archive);

        return this.LoadAction(actionDir);
      }
    });
  }
}

export default StepActionRemote;
