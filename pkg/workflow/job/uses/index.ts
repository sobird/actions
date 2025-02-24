/**
 * jobs.<job_id>.uses
 *
 * sobird<i@sobird.me> at 2024/10/18 16:34:46 created.
 */

import path from 'node:path';

import Executor from '@/pkg/common/executor';
import Git from '@/pkg/common/git';
import type Runner from '@/pkg/runner';
import WorkflowPlanner from '@/pkg/workflow/planner';
import Reusable from '@/pkg/workflow/reusable';
import { readEntry } from '@/utils/tar';

class Uses extends Reusable {
  get Executor() {
    return this.isYaml ? this.executor : false;
  }

  executor(runner: Runner) {
    if (!this.isYaml) {
      // @todo throw error or logger error ? 执行时机，构造方法中抛出错误，还是此处抛出？
      // throw new Error(`'uses' key references invalid workflow path '${this.uses}'. Must start with './' if it's a local workflow, or must start with '<org>/<repo>/' and include an '@' if it's a remote workflow`);
      return;
    }

    const { repository, sha, server_url: serverUrl } = runner!.context.github;
    this.url = this.url || serverUrl;
    this.token = runner.Token;

    // local reusable workflow
    if (this.isLocal) {
      if (runner.config.skipCheckout) {
        return Uses.ReusableWorkflowExecutor(this.path);
      }

      this.repository = repository;
      this.ref = sha;
    }

    if (runner.config.actionCache) {
      return Uses.ActionCacheReusableWorkflowExecutor(this);
    }

    const repositoryDir = path.join(runner.ActionCacheDir, this.repository, this.ref);
    return Git.CloneExecutor(repositoryDir, this.url, this.ref)
      .finally(Uses.ReusableWorkflowExecutor(path.join(repositoryDir, this.path)));
  }

  get isYaml() {
    return this.uses.match(/\.(ya?ml)(?:$|@)/);
  }

  static ReusableWorkflowExecutor(workflowPath: string) {
    return new Executor(async (runner) => {
      const workflowPlanner = await WorkflowPlanner.Collect(workflowPath);
      const plan = workflowPlanner.planEvent('workflow_call');
      await plan.executor(runner!.config, runner).execute();
    });
  }

  static ActionCacheReusableWorkflowExecutor(reusable: Reusable) {
    return new Executor(async (runner) => {
      const { actionCache } = runner!.config;
      if (actionCache) {
        await actionCache.fetch(reusable.url, reusable.repository, reusable.ref);
        const archive = await actionCache.archive(reusable.repository, reusable.ref, reusable.path);
        const entry = await readEntry(archive);
        if (entry) {
          const workflowPlanner = WorkflowPlanner.Single(entry.body);
          const plan = workflowPlanner.planEvent('workflow_call');
          await plan.executor(runner!.config, runner).execute();
        }
      }
    });
  }
}

export default Uses;
