/**
 * step remote uses
 *
 * @see @/pkg/workflow/job/job-reusable-workflow.ts
 *
 * sobird<i@sobird.me> at 2024/05/21 16:20:47 created.
 */
import fs from 'node:fs';
import path from 'node:path';

import Executor from '@/pkg/common/executor';
import Git from '@/pkg/common/git';
import Action from '@/pkg/runner/action';
import Reusable from '@/pkg/workflow/reusable';
import { readEntry } from '@/utils/tar';

import StepAction from '.';

class StepActionRemote extends StepAction {
  // Prepare Action Instance
  public pre() {
    return new Executor((ctx) => {
      const runner = ctx!;
      const reusable = new Reusable(this.uses, runner.Token);
      const { repository, sha, server_url: serverUrl } = runner!.context.github;
      reusable.url = reusable.url || serverUrl;

      if (reusable.is('actions', 'checkout') && runner.config.skipCheckout) {
        //
      }

      if (reusable.isLocal) {
        if (runner.config.skipCheckout) {
          return this.reusableActionExecutor(reusable.path);
        }
        reusable.repository = repository;
        reusable.ref = sha;
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

      if (runner.config.actionCache) {
        return this.actionCacheReusableActionExecutor(reusable);
      }

      const repositoryDir = path.join(runner.ActionCacheDir, reusable.repository, reusable.ref);
      const actionDir = path.join(repositoryDir, reusable.path);
      return Git.CloneExecutor(repositoryDir, reusable.repositoryUrl, reusable.ref).finally(this.reusableActionExecutor(actionDir));
    });
  }

  public main() {
    return this.executor(new Executor(() => {
      console.error('this.uses', this.action);

      // return this.action?.executor();
    }));
  }

  public post() {
    return new Executor(() => {});
  }

  reusableActionExecutor(actionDir: string) {
    return new Executor(async () => {
      this.action = await Action.Scan((filename) => {
        if (!fs.existsSync(actionDir)) {
          return false;
        }

        const stat = fs.statSync(actionDir);

        if (stat.isDirectory()) {
          const file = path.join(actionDir, filename);
          if (fs.existsSync(file)) {
            return fs.readFileSync(file, 'utf8');
          }
        }

        if (stat.isFile()) {
          if (fs.existsSync(actionDir)) {
            return fs.readFileSync(actionDir, 'utf8');
          }
        }

        return false;
      });
    });
  }

  actionCacheReusableActionExecutor(reusable: Reusable) {
    return new Executor(async (ctx) => {
      const runner = ctx!;

      const { actionCache } = runner.config;
      if (actionCache) {
        await actionCache.fetch(reusable.repositoryUrl, reusable.repository, reusable.ref);
        this.action = await Action.Pick(async (filename) => {
          const archive = await actionCache.archive(reusable.repository, reusable.ref, filename);
          const entry = await readEntry(archive);
          return entry ? entry.body : false;
        });
      }
    });
  }
}

export default StepActionRemote;
