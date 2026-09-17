/**
 * step remote uses
 *
 * @see @/workflow/job/job-reusable-workflow.ts
 *
 * sobird<i@sobird.me> at 2024/05/21 16:20:47 created.
 */

import path from 'node:path';

import { WellKnownDirectory } from '@/common/constants';
import Executor, { Conditional } from '@/common/executor';
import Git from '@/common/git';
import logger from '@/common/logger';
import { hostOf } from '@/utils';
import Reusable from '@/workflow/reusable';

import StepAction from '.';

class StepActionRemote extends StepAction {
  protected get PrepareAction() {
    return new Executor((ctx) => {
      const runner = ctx!;
      const { uses } = this;

      const { server_url: serverUrl } = runner!.context.github;
      uses.url = uses.url || runner.config.actionInstance || serverUrl;

      if (!uses.url.startsWith('http://') && !uses.url.startsWith('https://')) {
        uses.url = `https://${uses.url}`;
      }

      const replaceGheActionWithGithubCom = runner.config.replaceGheActionWithGithubCom || [];
      replaceGheActionWithGithubCom.forEach((action) => {
        if (uses.repository === action) {
          uses.url = 'https://github.com';
          uses.token = runner.config.replaceGheActionTokenWithGithubCom ?? '';
        }
      });

      if (!runner.config.actionCache) {
        return this.reusableCacheAction(uses);
      }

      // checkout 目录也按 host 分片，跟裸库缓存对齐，同一仓库在不同主机上互不顶掉
      const repositoryDir = path.join(runner.ActionCacheDir, hostOf(uses.repositoryUrl), uses.repository, uses.ref);
      return Git.CloneExecutor(repositoryDir, uses.repositoryUrl, uses.ref, uses.token).finally(
        this.reusableAction(uses),
      );
    }).ifNot(this.SkipCheckoutSelf);
  }

  public pre() {
    return new Executor(() => {
      return this.action?.Pre;
    });
  }

  public main() {
    return new Executor(async (ctx) => {
      const runner = ctx!;

      if (await this.SkipCheckoutSelf.evaluate(runner)) {
        if (runner?.config.bindWorkdir) {
          logger.debug('Skipping local actions/checkout because you bound your workspace');
          return;
        }
        // const workdir = runner.container?.resolve(runner.config.workdir) || '';
        const copyToPath = path.join(runner.config.workdir, this.with.evaluate(runner)?.path || '');

        return runner.container?.put(copyToPath, runner.config.workdir, runner.config.useGitignore);
      }

      this.applyEnv(runner, this.environment);
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

      const repositoryDir = path.join(
        runner.ActionCacheDir,
        hostOf(reusable.repositoryUrl),
        reusable.repository,
        reusable.ref,
      );
      const actionLocalDir = path.join(repositoryDir, reusable.path);
      const actionDir = path.join(WellKnownDirectory.Actions, reusable.repository, reusable.ref);

      return runner.container?.put(actionDir, actionLocalDir).next(this.LoadAction(actionDir));
    });
  }

  private reusableCacheAction(reusable: Reusable) {
    return new Executor(async (ctx) => {
      const runner = ctx!;

      const { actionCache } = runner.config;
      if (actionCache) {
        const sha = await actionCache.fetch(reusable.repositoryUrl, reusable.repository, reusable.ref, reusable.token);
        const archive = await actionCache.archive(reusable.repositoryUrl, reusable.repository, sha, '.');
        const actionDir = path.join(WellKnownDirectory.Actions, reusable.repository, reusable.ref);

        return runner.container?.putArchive(actionDir, archive).next(this.LoadAction(actionDir));
      }
    });
  }
}

export default StepActionRemote;
