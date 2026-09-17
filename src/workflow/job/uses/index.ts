/**
 * jobs.<job_id>.uses
 *
 * sobird<i@sobird.me> at 2024/10/18 16:34:46 created.
 */

import path from 'node:path';

import Executor from '@/common/executor';
import Git from '@/common/git';
import type Runner from '@/runner';
import { hostOf } from '@/utils';
import { readEntry } from '@/utils/tar';
import WorkflowPlanner from '@/workflow/planner';
import Reusable from '@/workflow/reusable';

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
        // 文件就在 caller 的工作区里，属于 caller 当前 checkout 的那个提交
        return Uses.ReusableWorkflowExecutor(this.path, sha);
      }

      this.repository = repository;
      this.ref = sha;
    }

    if (runner.config.actionCache) {
      return Uses.ActionCacheReusableWorkflowExecutor(this);
    }

    // checkout 目录也按 host 分片，跟裸库缓存对齐，同一仓库在不同主机上互不顶掉
    const repositoryDir = path.join(runner.ActionCacheDir, hostOf(this.repositoryUrl), this.repository, this.ref);
    return Git.CloneExecutor(repositoryDir, this.repositoryUrl, this.ref, this.token).finally(
      // 克隆出来的文件属于克隆目录那个仓库，要等 clone 完才解析得出它的提交
      Uses.ReusableWorkflowExecutor(path.join(repositoryDir, this.path), () => Git.Revision(repositoryDir)),
    );
  }

  get isYaml() {
    return this.uses.match(/\.(ya?ml)(?:$|@)/);
  }

  /**
   * 被调 workflow 的 sha 取它自己所在的那个提交：已经在工作区里的由 caller 直接给出，
   * 克隆出来的要等 clone 完才解析得出，所以也可以传一个 thunk
   */
  static ReusableWorkflowExecutor(workflowPath: string, sha?: string | (() => Promise<string | undefined>)) {
    return new Executor(async (runner) => {
      const workflowSha = typeof sha === 'function' ? await sha() : sha;
      const workflowPlanner = await WorkflowPlanner.Collect(workflowPath, false, workflowSha);
      const plan = await workflowPlanner.planEvent('workflow_call');
      await plan.executor(runner!.config, runner).execute();
    });
  }

  static ActionCacheReusableWorkflowExecutor(reusable: Reusable) {
    return new Executor(async (runner) => {
      const { actionCache } = runner!.config;
      if (actionCache) {
        const sha = await actionCache.fetch(reusable.repositoryUrl, reusable.repository, reusable.ref, reusable.token);
        const archive = await actionCache.archive(reusable.repositoryUrl, reusable.repository, sha, reusable.path);
        const entry = await readEntry(archive);
        if (entry) {
          const workflowPlanner = WorkflowPlanner.Single(entry.body);
          // 缓存是按 fetch 解析出的那个提交取的，被调 workflow 的 sha 就是它
          for (const workflow of workflowPlanner.workflows) {
            workflow.sha = sha;
          }
          const plan = await workflowPlanner.planEvent('workflow_call');
          await plan.executor(runner!.config, runner).execute();
        }
      }
    });
  }
}

export default Uses;
