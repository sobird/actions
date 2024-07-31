/**
 * Reusing workflows
 *
 * @see https://docs.github.com/en/actions/using-workflows/reusing-workflows
 *
 * sobird<i@sobird.me> at 2024/07/14 16:32:46 created.
 */

import path from 'node:path';

import Executor from '@/pkg/common/executor';
import Git from '@/pkg/common/git';
import type Runner from '@/pkg/runner';
import WorkflowPlanner from '@/pkg/workflow/planner';

import Job from './job';

class JobReusableWorkflow extends Job {
  executor(runner: Runner) {
    let { uses = '' } = this;
    const reusable = {
      url: '',
      repository: '',
      filename: '',
      ref: '',
    };

    const matches = /^(https?:\/\/[^/?#]+\/)?([^/@]+)(?:\/([^/@]+))?(?:\/([^@]*))?(?:@(.*))?$/.exec(uses);
    if (matches) {
      const { server_url: serverUrl, sha } = runner.context.github;
      const [,url = serverUrl, owner, repo, filename, ref = sha] = matches;
      reusable.url = url;
      reusable.repository = `${owner}/${repo}`;
      reusable.filename = filename;
      reusable.ref = ref;
    }

    // local reusable workflow
    if (uses.startsWith('./')) {
      uses = uses.substring(2);
      if (runner.config.skipCheckout) {
        return JobReusableWorkflow.ReusableWorkflowExecutor(uses, runner);
      }
      // remote resuable workflow
      const { repository, sha, server_url: serverUrl } = runner.context.github;
      reusable.url = serverUrl;
      reusable.repository = repository;
      reusable.filename = uses;
      reusable.ref = sha;
    }

    const repositoryDir = path.join(runner.ActionCacheDir, reusable.repository, reusable.ref);
    const url = new URL(reusable.repository, reusable.url);

    if (runner.Token) {
      url.username = 'token';
      url.password = runner.Token;
    }
    const workflowpath = path.join(repositoryDir, reusable.filename);
    return Git.CloneExecutor(url.toString(), repositoryDir, reusable.ref).next(JobReusableWorkflow.ReusableWorkflowExecutor(workflowpath, runner));
  }

  static ReusableWorkflowExecutor(workflowPath: string, runner: Runner) {
    return new Executor(async () => {
      const workflowPlanner = await WorkflowPlanner.Collect(workflowPath);
      const plan = workflowPlanner.planEvent('workflow_call');
      await plan.executor(runner.config, runner).execute();
    });
  }
}

export default JobReusableWorkflow;
