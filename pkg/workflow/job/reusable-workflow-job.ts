import path from 'node:path';

import Executor from '@/pkg/common/executor';
import Git from '@/pkg/common/git';
import type Runner from '@/pkg/runner';
import WorkflowPlanner from '@/pkg/workflow/planner';

import Job from '.';

class ReusableWorkflowJob extends Job {
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
        return ReusableWorkflowJob.ReusableWorkflowExecutor(uses, runner);
      }
      // remote resuable workflow
      const { repository, sha, server_url: serverUrl } = runner.context.github;
      reusable.url = serverUrl;
      reusable.repository = repository;
      reusable.filename = uses;
      reusable.ref = sha;
    }

    const repositoryDir = path.join(runner.actionCacheDir, reusable.repository, reusable.ref);
    const url = new URL(reusable.repository, reusable.url);

    if (runner.token) {
      url.username = 'token';
      url.password = runner.token;
    }
    const workflowpath = path.join(repositoryDir, reusable.filename);
    return Git.CloneExecutor(url.toString(), repositoryDir, reusable.ref).next(ReusableWorkflowJob.ReusableWorkflowExecutor(workflowpath, runner));
  }

  static ReusableWorkflowExecutor(workflowPath: string, runner: Runner) {
    return new Executor(async () => {
      const workflowPlanner = await WorkflowPlanner.Collect(workflowPath);
      const plan = workflowPlanner.planEvent('workflow_call');
      await plan.executor(runner.config, runner).execute();
    });
  }
}

export default ReusableWorkflowJob;
