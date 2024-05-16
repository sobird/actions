/* eslint-disable no-underscore-dangle */
/**
 * Job is the structure of one job in a workflow
 *
 * sobird<i@sobird.me> at 2024/05/02 20:26:29 created.
 */
import log4js from 'log4js';

import Executor from '@/pkg/common/executor';
import Reporter from '@/pkg/reporter';
import { asyncFunction } from '@/utils';

import Container from './container';
import Step from './step';
import Strategy from './strategy';
import {
  WorkflowDispatchInputs, Permissions, Concurrency, Defaults,
} from '../types';

const logger = log4js.getLogger();

export enum JobType {
  /**
   * all jobs that have a `run` attribute
   */
  Default,

  /**
   * all jobs that have a `uses` that is a local workflow in the .github/workflows directory
   */
  ReusableWorkflowLocal,

  /**
   * all jobs that have a `uses` that references a workflow file in a github repo
   */
  ReusableWorkflowRemote,

  /**
   * represents a job which is not configured correctly
   */
  Invalid,
}

/**
 * Use `jobs.<job_id>` to give your job a unique identifier.
 * The key `job_id` is a string and its value is a map of the job's configuration data.
 * You must replace `<job_id>` with a string that is unique to the `jobs` object.
 * The `<job_id>` must start with a letter or `_` and contain only alphanumeric characters, `-`, or `_`.
 */
class Job {
  /**
   * Use `jobs.<job_id>.name` to set a name for the job, which is displayed in the GitHub UI.
   */
  name: string;

  /**
   * For a specific job, you can use `jobs.<job_id>.permissions` to modify the default permissions granted to the `GITHUB_TOKEN`,
   * adding or removing access as required, so that you only allow the minimum required access.
   * For more information, see "{@link https://docs.github.com/en/actions/security-guides/automatic-token-authentication#permissions-for-the-github_token Automatic token authentication}."
   *
   * By specifying the permission within a job definition,
   * you can configure a different set of permissions for the `GITHUB_TOKEN` for each job,
   * if required. Alternatively, you can specify the permissions for all jobs in the workflow.
   * For information on defining permissions at the workflow level, see {@link https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#permissions permissions}.
   *
   * For each of the available scopes, shown in the table below,
   * you can assign one of the permissions: `read`, `write`, or `none`.
   * If you specify the access for any of these scopes,
   * all of those that are not specified are set to `none`.
   */
  permissions?: Permissions;

  /**
   * Use `jobs.<job_id>.needs` to identify any jobs that must complete successfully before this job will run.
   * It can be a string or array of strings.
   * If a job fails or is skipped, all jobs that need it are skipped unless the jobs use a conditional expression that causes the job to continue.
   * If a run contains a series of jobs that need each other, a failure or skip applies to all jobs in the dependency chain from the point of failure or skip onwards.
   * If you would like a job to run even if a job it is dependent on did not succeed, use the `always()` conditional expression in `jobs.<job_id>.if`.
   */
  needs?: string[];

  /**
   * You can use the `jobs.<job_id>.if` conditional to prevent a job from running unless a condition is met.
   * You can use any supported context and expression to create a conditional.
   * For more information on which contexts are supported in this key, see "{@link https://docs.github.com/en/actions/learn-github-actions/contexts#context-availability Contexts}."
   *
   * Note: The `jobs.<job_id>.if` condition is evaluated before {@link https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idstrategymatrix `jobs.<job_id>.strategy.matrix`} is applied.
   *
   * When you use expressions in an if conditional, you can, optionally, omit the `${{ }}` expression syntax because GitHub Actions automatically evaluates the if conditional as an expression.
   * However, this exception does not apply everywhere.
   *
   * You must always use the `${{ }}` expression syntax or escape with `''`, `""`, or `()` when the expression starts with `!`,
   * since `!` is reserved notation in YAML format. For example:
   *
   * ```yaml
   * if: ${{ ! startsWith(github.ref, 'refs/tags/') }}
   * ```
   */
  if?: string | boolean;

  /**
   * Use `jobs.<job_id>.runs-on` to define the type of machine to run the job on.
   *
   * The destination machine can be either a {@link https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#choosing-github-hosted-runners GitHub-hosted runner}, {@link https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#choosing-runners-in-a-group larger runner}, or a {@link https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#choosing-self-hosted-runners self-hosted runner}.
   *
   * You can target runners based on the labels assigned to them, or their group membership, or a combination of these.
   *
   * You can provide `runs-on` as:
   * * a single string
   * * a single variable containing a string
   * * an array of strings, variables containing strings, or a combination of both
   * * a `key: value` pair using the `group` or `labels` keys
   *
   * If you specify an array of strings or variables,
   * your workflow will execute on any runner that matches all of the specified `runs-on` values.
   * For example, here the job will only run on a self-hosted runner that has the labels `linux`, `x64`, and `gpu`:
   *
   * ```yaml
   * runs-on: [self-hosted, linux, x64, gpu]
   * ```
   *
   * For more information, see "{@link https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#choosing-self-hosted-runners Choosing self-hosted runners}."
   */
  'runs-on': string | string[] | { group: string;labels: string; };

  /**
   * Use `jobs.<job_id>.environment` to define the environment that the job references.
   * All deployment protection rules must pass before a job referencing the environment is sent to a runner.
   * For more information, see "{@link https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment Using environments for deployment}."
   *
   * You can provide the environment as only the environment `name`,
   * or as an environment object with the `name` and `url`.
   * The URL maps to `environment_url` in the deployments API.
   * For more information about the deployments API, see "{@link https://docs.github.com/en/rest/repos#deployments REST API endpoints for repositories}."
   *
   * * Example: Using a single environment name
   * ```yaml
   * environment: staging_environment
   * ```
   * * Example: Using environment name and URL
   * ```yaml
   * environment:
   *   name: production_environment
   *   url: https://github.com
   * ```
   *
   * The value of `url` can be an expression. Allowed expression contexts: `github`, `inputs`, `vars`, `needs`, `strategy`, `matrix`, `job`, `runner`, and `env`.
   * For more information about expressions, see "{@link https://docs.github.com/en/actions/learn-github-actions/expressions Expressions}."
   *
   * * Example: Using output as URL
   * ```yaml
   * environment:
   *   name: production_environment
   *   url: ${{ steps.step_id.outputs.url_output }}
   * ```
   *
   * The value of `name` can be an expression. Allowed expression contexts: `github`, `inputs`, `vars`, `needs`, `strategy`, and `matrix`.
   * For more information about expressions, see "{@link https://docs.github.com/en/actions/learn-github-actions/expressions Expressions}."
   *
   * * Example: Using an expression as environment name
   * ```yaml
   * environment:
   *   name: ${{ github.ref_name }}
   * ```
   */
  environment?: string | {
    name?: string;
    url?: string;
  };

  /**
   * You can use `jobs.<job_id>.concurrency` to ensure that only a single job or workflow using the same concurrency group will run at a time.
   * A concurrency group can be any string or expression.
   * Allowed expression contexts: `github`, `inputs`, `vars`, `needs`, `strategy`, and `matrix`.
   * For more information about expressions, see "{@link https://docs.github.com/en/actions/learn-github-actions/expressions Expressions}."
   *
   * You can also specify concurrency at the workflow level. For more information, see {@link https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#concurrency concurrency}.
   *
   * When a concurrent job or workflow is queued,
   * if another job or workflow using the same concurrency group in the repository is in progress,
   * the queued job or workflow will be `pending`.
   * Any pending job or workflow in the concurrency group will be canceled.
   * This means that there can be at most one running and one pending job in a concurrency group at any time.
   *
   * To also cancel any currently running job or workflow in the same concurrency group, specify `cancel-in-progress: true`.
   * To conditionally cancel currently running jobs or workflows in the same concurrency group,
   * you can specify `cancel-in-progress` as an expression with any of the allowed expression contexts.
   */
  concurrency?: Concurrency;

  /**
   * You can use `jobs.<job_id>.outputs` to create a `map` of outputs for a job.
   * Job outputs are available to all downstream jobs that depend on this job.
   * For more information on defining job dependencies, see {@link https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idneeds `jobs.<job_id>.needs`}.
   *
   * Outputs are Unicode strings, and can be a maximum of 1 MB.
   * The total of all outputs in a workflow run can be a maximum of 50 MB.
   *
   * Job outputs containing expressions are evaluated on the runner at the end of each job.
   * Outputs containing secrets are redacted on the runner and not sent to GitHub Actions.
   *
   * To use job outputs in a dependent job, you can use the `needs` context.
   * For more information, see "{@link https://docs.github.com/en/actions/learn-github-actions/contexts#needs-context Contexts}."
   *
   * **Note:** `$GITHUB_OUTPUT `is shared between all steps in a job.
   * If you use the same output name in multiple steps,
   * the last step to write to the output will override the value.
   * If your job uses a matrix and writes to `$GITHUB_OUTPUT`,
   * the content will be overwritten for each matrix combination.
   * You can use the `matrix` context to create unique output names for each job configuration.
   * For more information, see "{@link https://docs.github.com/en/actions/learn-github-actions/contexts#matrix-context Contexts}."
   */
  outputs?: Record<string, string>;

  /**
   * A map of variables that are available to all steps in the job.
   * You can set variables for the entire workflow or an individual step.
   * For more information, see {@link https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#env `env`} and {@link https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idstepsenv jobs.<job_id>.steps[*].env}.
   *
   * When more than one environment variable is defined with the same name, GitHub uses the most specific variable.
   * For example, an environment variable defined in a step will override job and workflow environment variables with the same name, while the step executes.
   * An environment variable defined for a job will override a workflow variable with the same name, while the job executes.
   */
  env?: Record<string, string>;

  /**
   * Use `jobs.<job_id>.defaults` to create a map of default settings that will apply to all steps in the job.
   * You can also set default settings for the entire workflow.
   * For more information, see {@link https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#defaults defaults}.
   *
   * When more than one default setting is defined with the same name,
   * GitHub uses the most specific default setting.
   * For example, a default setting defined in a job will override a default setting that has the same name defined in a workflow.
   */
  defaults?: Defaults;

  /**
   * A job contains a sequence of tasks called steps.
   * Steps can run commands, run setup tasks, or run an action in your repository, a public repository, or an action published in a Docker registry.
   * Not all steps run actions, but all actions run as a step.
   * Each step runs in its own process in the runner environment and has access to the workspace and filesystem.
   * Because steps run in their own process, changes to environment variables are not preserved between steps.
   * GitHub provides built-in steps to set up and complete a job.
   *
   * GitHub only displays the first 1,000 checks, however, you can run an unlimited number of steps as long as you are within the workflow usage limits.
   * For more information, see "{@link https://docs.github.com/en/actions/learn-github-actions/usage-limits-billing-and-administration Usage limits, billing, and administration}" for GitHub-hosted runners and "{@link https://docs.github.com/en/actions/hosting-your-own-runners/managing-self-hosted-runners/about-self-hosted-runners#usage-limits About self-hosted runners}" for self-hosted runner usage limits.
   */
  steps: Step[] = [];

  /**
   * The maximum number of minutes to let a job run before GitHub automatically cancels it. Default: 360
   *
   * If the timeout exceeds the job execution time limit for the runner,
   * the job will be canceled when the execution time limit is met instead.
   * For more information about job execution time limits,
   * see "{@link https://docs.github.com/en/actions/learn-github-actions/usage-limits-billing-and-administration#usage-limits Usage limits, billing, and administration}" for GitHub-hosted runners and "{@link https://docs.github.com/en/actions/hosting-your-own-runners/managing-self-hosted-runners/about-self-hosted-runners#usage-limits About self-hosted runners}" for self-hosted runner usage limits.
   *
   * **Note:** The `GITHUB_TOKEN` expires when a job finishes or after a maximum of 24 hours.
   * For self-hosted runners, the token may be the limiting factor if the job timeout is greater than 24 hours.
   * For more information on the `GITHUB_TOKEN`, see "{@link https://docs.github.com/en/actions/security-guides/automatic-token-authentication#about-the-github_token-secret Automatic token authentication}."
   */
  'timeout-minutes': number;

  /**
   * Use `jobs.<job_id>.strategy` to use a matrix strategy for your jobs.
   * A matrix strategy lets you use variables in a single job definition to automatically create multiple job runs that are based on the combinations of the variables.
   * For example, you can use a matrix strategy to test your code in multiple versions of a language or on multiple operating systems.
   * For more information, see "{@link https://docs.github.com/en/actions/using-jobs/using-a-matrix-for-your-jobs `Using a matrix for your jobs`}."
   */
  strategy: Strategy;

  /**
   * Prevents a workflow run from failing when a job fails.
   * Set to `true` to allow a workflow run to pass when this job fails.
   */
  'continue-on-error': boolean;

  container: Container;

  /**
   * Note: If your workflows use Docker container actions, job containers, or service containers, then you must use a Linux runner:
   * * If you are using GitHub-hosted runners, you must use an Ubuntu runner.
   * * If you are using self-hosted runners, you must use a Linux machine as your runner and Docker must be installed.
   *
   * Used to host service containers for a job in a workflow.
   * Service containers are useful for creating databases or cache services like Redis.
   * The runner automatically creates a Docker network and manages the life cycle of the service containers.
   *
   * If you configure your job to run in a container, or your step uses container actions, you don't need to map ports to access the service or action.
   * Docker automatically exposes all ports between containers on the same Docker user-defined bridge network.
   * You can directly reference the service container by its hostname.
   * The hostname is automatically mapped to the label name you configure for the service in the workflow.
   *
   * If you configure the job to run directly on the runner machine and your step doesn't use a container action,
   * you must map any required Docker service container ports to the Docker host (the runner machine).
   * You can access the service container using localhost and the mapped port.
   *
   * For more information about the differences between networking service containers, see "{@link https://docs.github.com/en/actions/using-containerized-services/about-service-containers About service containers}."
   */
  services?: Record<string, Container>;

  /**
   * The location and version of a reusable workflow file to run as a job. Use one of the following syntaxes:
   *
   * * `{owner}/{repo}/.github/workflows/{filename}@{ref}` for reusable workflows in public and private repositories.
   * * `./.github/workflows/{filename}` for reusable workflows in the same repository.
   *
   * In the first option, `{ref}` can be a SHA, a release tag, or a branch name.
   * If a release tag and a branch have the same name, the release tag takes precedence over the branch name.
   * Using the commit SHA is the safest option for stability and security.
   * For more information, see "{@link https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions#reusing-third-party-workflows Security hardening for GitHub Actions}".
   *
   * If you use the second syntax option (without `{owner}/{repo}` and `@{ref}`) the called workflow is from the same commit as the caller workflow.
   * Ref prefixes such as `refs/heads` and `refs/tags` are not allowed.
   */
  uses?: string;

  /**
   * When a job is used to call a reusable workflow,
   * you can use `with` to provide a map of inputs that are passed to the called workflow.
   *
   * Any inputs that you pass must match the input specifications defined in the called workflow.
   *
   * Unlike `jobs.<job_id>.steps[*].with`, the inputs you pass with `jobs.<job_id>.with` are not available as environment variables in the called workflow.
   * Instead, you can reference the inputs by using the inputs context.
   */
  with?: Record<string, string | WorkflowDispatchInputs>;

  /**
   * When a job is used to call a reusable workflow,
   * you can use `secrets` to provide a map of secrets that are passed to the called workflow.
   *
   * Any secrets that you pass must match the names defined in the called workflow.
   *
   * Use the `inherit` keyword to pass all the calling workflow's secrets to the called workflow.
   * This includes all secrets the calling workflow has access to, namely organization, repository, and environment secrets.
   * The `inherit` keyword can be used to pass secrets across repositories within the same organization, or across organizations within the same enterprise.
   *
   * A pair consisting of a string identifier for the secret and the value of the secret.
   * The identifier must match the name of a secret defined by {@link https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#onworkflow_callsecretssecret_id `on.workflow_call.secrets.<secret_id>`} in the called workflow.
   * Allowed expression contexts: `github`, `needs`, and `secrets`.
   */
  secrets?: Record<string, string> | 'inherit';

  constructor(job: Job) {
    this.name = job.name;
    this.permissions = job.permissions;
    this.needs = job.needs;
    this.if = job.if;
    this['runs-on'] = job['runs-on'];
    this.environment = job.environment;
    this.concurrency = job.concurrency;
    this.outputs = job.outputs;
    this.env = job.env;
    this.defaults = job.defaults;
    if (Array.isArray(job.steps)) {
      this.steps = job.steps.map((step) => {
        return new Step(step);
      });
    }

    this['timeout-minutes'] = job['timeout-minutes'];
    this.strategy = new Strategy(job.strategy);
    this['continue-on-error'] = job['continue-on-error'];
    this.container = new Container(job.container);
    this.services = job.services;
    this.uses = job.uses;
    this.with = job.with;
    this.secrets = job.secrets;
  }

  getNeeds() {
    if (!this.needs) {
      return [];
    }
    return typeof this.needs === 'string' ? [this.needs] : this.needs;
  }

  getRunsOn() {
    const runsOn = this['runs-on'];
    if (typeof runsOn === 'string') {
      return [runsOn];
    }
    if (Array.isArray(runsOn)) {
      return runsOn;
    }

    const { group, labels } = runsOn;
    let results = [];

    if (typeof labels === 'string') {
      results.push(labels);
    } else if (Array.isArray(labels)) {
      results = labels;
    }
    if (group) {
      results.push(group);
    }

    return results;
  }

  get type() {
    if (this.uses) {
      // 检查是否为YAML文件
      const isYaml = this.uses.match(/\.(ya?ml)(?:$|@)/);

      if (isYaml) {
        // 检查是否为本地工作流路径
        const isLocalPath = this.uses.startsWith('./');
        // 检查是否为远程工作流路径
        const isRemotePath = this.uses.match(/^[^.](.+?\/){2,}\S*\.ya?ml@/);
        // 检查是否包含版本信息
        const hasVersion = this.uses.match('.ya?ml@');

        if (isLocalPath) {
          return JobType.ReusableWorkflowLocal;
        } if (isRemotePath && hasVersion) {
          return JobType.ReusableWorkflowRemote;
        }
      }

      // 如果不是有效的工作流路径，返回无效类型
      // throw new Error(`\`uses\` key references invalid workflow path '${this.uses}'. Must start with './' if it's a local workflow, or must start with '<org>/<repo>/' and include an '@' if it's a remote workflow`);

      return JobType.Invalid;
    }

    // 如果不是可复用的工作流，则返回默认类型
    return JobType.Default;
  }

  executor(reporter: Reporter) {
    const { strategy } = this;
    const stageExecutor: Executor[] = [];

    const matrices = strategy.selectMatrices({});
    logger.debug('Final matrix after applying user inclusions', matrices);

    const maxParallel = Math.min(strategy.getMaxParallel(), matrices.length);
    console.log('maxParallel', maxParallel);

    matrices.forEach((matrix) => {
      logger.debug('matrix: %v', matrix);
    });

    // mock job 执行过程

    // todo 处理 Context, strategy 和 matrix

    // todo
    return Executor.parallel(1, new Executor(async () => {
      const entry = {
        data: [this.name],
        startTime: new Date(),
        context: {
          stage: '',
          jobResult: '',
          stepNumber: 0,
          raw_output: true,
          stepResult: '',
        },
      };

      reporter.resetSteps(this.steps.length);

      reporter.fire(entry);
      await asyncFunction(1000);

      for (const [index, step] of this.steps.entries()) {
        const entry = {
          data: [this.name, '-', step.name],
          startTime: new Date(),
          context: {
            stage: 'Main',
            jobResult: '',
            stepNumber: index,
            raw_output: true,
            stepResult: '',
          },
        };

        reporter.fire(entry);
        reporter.log(this.name, '-', step.name);
        // eslint-disable-next-line no-await-in-loop
        await asyncFunction(500);
        reporter.log(this.name, '-', step.name);
        await asyncFunction(500);
        console.log('index', index);
        reporter.fire({
          data: [this.name, '-', step.name],
          startTime: new Date(),
          context: {
            stage: 'Main',
            jobResult: '',
            stepNumber: index,
            raw_output: true,
            stepResult: 'success',
          },
        });
        await asyncFunction(500);
      }

      await asyncFunction(1000);
      reporter.fire({
        data: [this.name, 'post'],
        startTime: new Date(),
        context: {
          stage: 'Post',
          jobResult: 'success',
          // stepNumber: index,
          raw_output: true,
          stepResult: 'success',
        },
      });
    }));
  }
}

export default Job;
