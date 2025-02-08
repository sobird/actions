/**
 * step remote uses
 *
 * @see @/pkg/workflow/job/job-reusable-workflow.ts
 *
 * sobird<i@sobird.me> at 2024/05/21 16:20:47 created.
 */

import path from 'node:path';

import log4js from 'log4js';

import Constants from '@/pkg/common/constants';
import Executor, { Conditional } from '@/pkg/common/executor';
import Git from '@/pkg/common/git';
import Reusable from '@/pkg/workflow/reusable';

import StepAction from '.';

const logger = log4js.getLogger();

class StepActionRemote extends StepAction {
  protected get PrepareAction() {
    return new Executor((ctx) => {
      const runner = ctx!;
      const { uses } = this;

      const { server_url: serverUrl } = runner!.context.github;
      uses.url = uses.url || runner.config.actionInstance || serverUrl;

      const replaceGheActionWithGithubCom = runner.config.replaceGheActionWithGithubCom || [];
      replaceGheActionWithGithubCom.forEach((action) => {
        if (uses.repository === action) {
          uses.url = 'https://github.com';
          uses.token = runner.config.replaceGheActionTokenWithGithubCom;
        }
      });

      if (!runner.config.actionCache) {
        return this.reusableCacheAction(uses);
      }

      const repositoryDir = path.join(runner.ActionCacheDir, uses.repository, uses.ref);
      return Git.CloneExecutor(repositoryDir, uses.repositoryUrl, uses.ref).finally(this.reusableAction(uses));
    }).ifNot(this.SkipCheckoutSelf);
  }

  public pre() {
    return new Executor(() => { return this.action?.Pre; });
  }

  public main() {
    return new Executor(async (ctx) => {
      const runner = ctx!;

      if (await this.SkipCheckoutSelf.evaluate(runner)) {
        if (runner?.config.bindWorkdir) {
          logger.debug('Skipping local actions/checkout because you bound your workspace');
          return;
        }
        const workdir = runner.container?.resolve(runner.config.workdir) || '';
        const copyToPath = path.join(workdir, this.with.evaluate(runner)?.path || '');

        return runner.container?.put(copyToPath, runner.config.workdir, runner.config.useGitignore);
      }

      return this.action?.Main;
    });
  }

  public get SkipCheckoutSelf() {
    return new Conditional(async (ctx) => {
      const runner = ctx!;
      const { uses } = this;

      if (uses.isCheckout && runner.config.skipCheckout) {
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

  private reusableCacheAction(reusable: Reusable) {
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
