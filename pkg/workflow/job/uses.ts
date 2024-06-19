import path from 'node:path';

import Executor from '@/pkg/common/executor';
import Git from '@/pkg/common/git';
import Runner from '@/pkg/runner';
import WorkflowPlanner from '@/pkg/workflow/planner';

/**
 * The location and version of a reusable workflow file to run as a job. Use one of the following syntaxes:
 * * `{owner}/{repo}/.github/workflows/{filename}@{ref}` for reusable workflows in public and private repositories.
 * * `./.github/workflows/{filename}` for reusable workflows in the same repository.
 *
 * In the first option, {ref} can be a SHA, a release tag, or a branch name.
 * If a release tag and a branch have the same name, the release tag takes precedence over the branch name.
 * Using the commit SHA is the safest option for stability and security. For more information, see "{@link https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions#reusing-third-party-workflows Security hardening for GitHub Actions}."
 * If you use the second syntax option (without `{owner}/{repo}` and `@{ref}`) the called workflow is from the same commit as the caller workflow.
 * Ref prefixes such as `refs/heads` and `refs/tags` are not allowed.
 *
 * Example of jobs.<job_id>.uses
 * ```yaml
 * jobs:
*    call-workflow-1-in-local-repo:
 *     uses: octo-org/this-repo/.github/workflows/workflow-1.yml@172239021f7ba04fe7327647b213799853a9eb89
 *   call-workflow-2-in-local-repo:
 *     uses: ./.github/workflows/workflow-2.yml
 *   call-workflow-in-another-repo:
 *     uses: octo-org/another-repo/.github/workflows/workflow.yml@v1
 * ```
 */
class Uses {
  #url: string = '';

  #repository: string = '';

  #filename: string = '';

  #ref: string = '';

  constructor(public uses?: string) {}

  executor(runner: Runner) {
    let { uses } = this;
    if (!uses) {
      return;
    }

    if (/\.(ya?ml)(?:$|@)/.exec(uses)) {
      // remote reusable workflow
      const remoteWorkflow = /^(https?:\/\/.*)\/([^/]+)\/([^/]+)\/\.([^/]+)\/workflows\/([^@]+)@(.*)$/;
      const remoteMatches = remoteWorkflow.exec(uses);
      if (remoteMatches && remoteMatches.length === 7) {
        const [,url, owner, repo, , filename, ref] = remoteMatches;
        this.#url = url;
        this.#repository = path.join(owner, repo);
        this.#filename = filename;
        this.#ref = ref;
      }

      const localWorkflow = /^(.+)\/([^/]+)\/\.([^/]+)\/workflows\/([^@]+)@(.*)$/;
      const localMatches = localWorkflow.exec(uses);
      if (localMatches && localMatches.length === 6) {
        const [,owner, repo, , filename, ref] = localMatches;
        this.#url = runner.context.github.server_url;
        this.#repository = path.join(owner, repo);
        this.#filename = filename;
        this.#ref = ref;
      }

      // local reusable workflow
      if (uses.startsWith('./')) {
        uses = uses.substring(2);
        // 本地命令行运行，还是通过服务运行
        if (runner.config.skipCheckout) {
          return Uses.ReusableWorkflowExecutor(runner, uses);
        }
        const { repository, sha, server_url: serverUrl } = runner.context.github;
        this.#url = serverUrl;
        this.#repository = repository;
        this.#filename = uses;
        this.#ref = sha;
      }

      const repositoryDir = path.join(runner.actionCacheDir, this.#repository, this.#ref);
      const url = new URL(this.#repository, this.#url);

      if (runner.token) {
        url.username = 'token';
        url.password = runner.token;
      }
      const workflowpath = path.join(repositoryDir, this.#filename);
      return Git.CloneExecutor(url.toString(), repositoryDir, this.#ref).next(Uses.ReusableWorkflowExecutor(runner, workflowpath));
    }
  }

  private static ReusableWorkflowExecutor(runner: Runner, workflowPath: string) {
    return new Executor(async () => {
      const workflowPlanner = await WorkflowPlanner.Collect(workflowPath);
      const plan = workflowPlanner.planEvent('workflow_call');
      await plan.executor(runner.config, runner).execute();
    });
  }

  toJSON() {
    return this.uses;
  }
}

export default Uses;
