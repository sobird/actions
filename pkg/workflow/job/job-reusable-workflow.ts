/**
 * Reusing workflows Local & Remote
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
import { readEntry } from '@/utils/tar';

import Job from './job';

interface Reusable {
  url: string;
  repository: string;
  filename: string;
  ref: string;
}

class JobReusableWorkflow extends Job {
  executor(runner: Runner) {
    let { uses = '' } = this;
    const reusable: Reusable = {
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
        return JobReusableWorkflow.ReusableWorkflowExecutor(uses);
      }

      // remote resuable workflow
      const { repository, sha, server_url: serverUrl } = runner.context.github;
      reusable.url = serverUrl;
      reusable.repository = repository;
      reusable.filename = uses;
      reusable.ref = sha;
    }

    const repositoryDir = path.join(runner.ActionCacheDir, reusable.repository, reusable.ref);

    try {
      const url = new URL(reusable.repository, reusable.url);

      if (runner.Token) {
        url.username = 'token';
        url.password = runner.Token;
      }

      reusable.url = url.toString();
    } catch (err) {
      //
    }

    if (runner.config.actionCache) {
      return JobReusableWorkflow.ActionCacheReusableWorkflowExecutor(reusable);
    }

    const workflowpath = path.join(repositoryDir, reusable.filename);
    return Git.CloneExecutor(repositoryDir, reusable.url, reusable.ref).next(JobReusableWorkflow.ReusableWorkflowExecutor(workflowpath));
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
        const archive = await actionCache.archive(reusable.repository, reusable.ref, reusable.filename);
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

export default JobReusableWorkflow;
