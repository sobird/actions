/**
 * step remote uses
 *
 * @see @/pkg/workflow/job/job-reusable-workflow.ts
 *
 * sobird<i@sobird.me> at 2024/05/21 16:20:47 created.
 */

import path from 'node:path';

import Constants from '@/pkg/common/constants';
import Executor, { Conditional } from '@/pkg/common/executor';
import Git from '@/pkg/common/git';
import Reusable from '@/pkg/workflow/reusable';

import StepAction from '.';

class StepActionRemote extends StepAction {
  // Prepare Action Instance

  public prepareAction(): Executor {
    return new Executor((ctx) => {
      const runner = ctx!;
      const reusable = new Reusable(this.uses, runner.Token);
      const { server_url: serverUrl } = runner!.context.github;
      reusable.url = reusable.url || serverUrl;

      const replaceGheActionWithGithubCom = runner.config.replaceGheActionWithGithubCom || [];
      replaceGheActionWithGithubCom.forEach((action) => {
        if (reusable.repository === action) {
          reusable.url = 'https://github.com';
          reusable.token = runner.config.replaceGheActionTokenWithGithubCom;
        }
      });

      if (!runner.config.actionCache) {
        return this.reusableCacheAction(reusable);
      }

      const repositoryDir = path.join(runner.ActionCacheDir, reusable.repository, reusable.ref);
      return Git.CloneExecutor(repositoryDir, reusable.repositoryUrl, reusable.ref).finally(this.reusableAction(reusable));
    }).ifNot(this.skipCheckoutSelf());
  }

  public pre() {
    return new Executor(async (ctx) => {
      const ddd = this.skipCheckoutSelf();
      console.log('skipCheckoutSelf', await ddd.evaluate(ctx));
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

  public skipCheckoutSelf() {
    return new Conditional(async (ctx) => {
      const runner = ctx!;
      const reusable = new Reusable(this.uses, runner.Token);
      if (reusable.isCheckout && runner.config.skipCheckout) {
        const stepWith = this.with.evaluate(runner);
        if (stepWith?.repository && stepWith.repository !== runner.context.github.repository) {
          return false;
        }

        if (stepWith?.ref && stepWith?.ref !== runner.context.github.ref) {
          return false;
        }
        return true;
      }
      return false;
    });
  }

  private reusableAction(reusable: Reusable) {
    return new Executor(async (ctx) => {
      const runner = ctx!;

      const repositoryDir = path.join(runner.ActionCacheDir, reusable.repository, reusable.ref);
      const actionLocalDir = path.join(repositoryDir, reusable.path);
      const actionDir = path.join(Constants.Directory.Actions, reusable.repository, reusable.ref);

      return runner.container?.put(actionDir, actionLocalDir).next(this.LoadAction(actionDir));
    });
  }

  reusableCacheAction(reusable: Reusable) {
    return new Executor(async (ctx) => {
      const runner = ctx!;

      const { actionCache } = runner.config;
      if (actionCache) {
        await actionCache.fetch(reusable.repositoryUrl, reusable.repository, reusable.ref);
        const archive = await actionCache.archive(reusable.repository, reusable.ref, '.');
        const actionDir = path.join(Constants.Directory.Actions, reusable.repository, reusable.ref);

        return runner.container?.putArchive(actionDir, archive).next(this.LoadAction(actionDir));
      }
    });
  }
}

export default StepActionRemote;
