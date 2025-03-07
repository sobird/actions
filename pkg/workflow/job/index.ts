/* eslint-disable no-underscore-dangle */
/**
 * Job is the structure of one job in a workflow
 *
 * sobird<i@sobird.me> at 2024/05/02 20:26:29 created.
 */

import Executor from '@/pkg/common/executor';
import Expression from '@/pkg/expression';
import Runner from '@/pkg/runner';
import { Needs } from '@/pkg/runner/context/needs';

import Container, { ContainerProps } from './container';
import Defaults, { DefaultsProps } from './defaults';
import Environment, { EnvironmentOptions } from './environment';
import { StepProps } from './step';
import Steps from './steps';
// import { StepProps } from './step/step';
import Strategy, { StrategyProps } from './strategy';
import Uses from './uses';
import {
  WorkflowDispatchInput, Permissions, Concurrency,
} from '../types';

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

export interface JobProps extends Pick<Job, 'permissions' | 'needs' | 'timeout-minutes' | 'services'> {
  id?: string;
  name: string;
  if?: string;
  'runs-on': string | string[] | { group: string;labels: string; };
  concurrency?: Concurrency;
  container?: ContainerProps;
  'continue-on-error'?: boolean;
  defaults?: DefaultsProps;
  env?: Record<string, string>;
  outputs: Record<string, string>;
  environment?: EnvironmentOptions;
  steps?: StepProps[];
  strategy?: StrategyProps;
  uses?: string;
  with?: Record<string, string | WorkflowDispatchInput>
  secrets?: Record<string, string> | 'inherit';
}

/**
 * Use `jobs.<job_id>` to give your job a unique identifier.
 * The key `job_id` is a string and its value is a map of the job's configuration data.
 * You must replace `<job_id>` with a string that is unique to the `jobs` object.
 * The `<job_id>` must start with a letter or `_` and contain only alphanumeric characters, `-`, or `_`.
 */
class Job {
  #id?: string;

  /**
   * The index of the current job in the matrix.
   * Note: This number is a zero-based number.
   * The first job's index in the matrix is 0.
   */
  #index: number = 0;

  /**
   * The total number of jobs in the matrix.
   * Note: This number is not a zero-based number.
   * For example, for a matrix with four jobs, the value of job-total is 4.
   */
  #total: number = 1;

  #result: Needs[string]['result'] = 'success';

  /**
   * 每次job运行完成时，都会将 this.outputs.evaluate(runner) 的运行结果存放到此处
   */
  #outputs: Record<string, string> = {};

  /**
   * Use `jobs.<job_id>.name` to set a name for the job, which is displayed in the GitHub UI.
   */
  name: Expression<JobProps['name']>;

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
  if: Expression<JobProps['if']>;

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
  'runs-on': Expression<JobProps['runs-on']>;

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
  environment: Environment;

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
  concurrency: Expression<JobProps['concurrency']>;

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
  outputs: Expression<JobProps['outputs']>;

  /**
   * A map of variables that are available to all steps in the job.
   * You can set variables for the entire workflow or an individual step.
   * For more information, see {@link https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#env `env`} and {@link https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idstepsenv jobs.<job_id>.steps[*].env}.
   *
   * When more than one environment variable is defined with the same name, GitHub uses the most specific variable.
   * For example, an environment variable defined in a step will override job and workflow environment variables with the same name, while the step executes.
   * An environment variable defined for a job will override a workflow variable with the same name, while the job executes.
   */
  env: Expression<JobProps['env']>;

  /**
   * Use `jobs.<job_id>.defaults` to create a map of default settings that will apply to all steps in the job.
   * You can also set default settings for the entire workflow.
   * For more information, see {@link https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#defaults defaults}.
   *
   * When more than one default setting is defined with the same name,
   * GitHub uses the most specific default setting.
   * For example, a default setting defined in a job will override a default setting that has the same name defined in a workflow.
   */
  defaults: Defaults;

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
  steps: Steps;

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
  'timeout-minutes'?: number;

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
  'continue-on-error': Expression<JobProps['continue-on-error']>;

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
  uses: Uses;

  /**
   * When a job is used to call a reusable workflow,
   * you can use `with` to provide a map of inputs that are passed to the called workflow.
   *
   * Any inputs that you pass must match the input specifications defined in the called workflow.
   *
   * Unlike `jobs.<job_id>.steps[*].with`, the inputs you pass with `jobs.<job_id>.with` are not available as environment variables in the called workflow.
   * Instead, you can reference the inputs by using the inputs context.
   */
  with: Expression<JobProps['with']>;

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
  secrets: Expression<JobProps['secrets']>;

  constructor(job: JobProps) {
    this.#id = job.id;

    this.name = new Expression(job.name, ['github', 'needs', 'strategy', 'matrix', 'vars', 'inputs'], [], '');
    this.permissions = job.permissions;
    this.needs = job.needs;
    this.if = new Expression(
      job.if,
      ['github', 'needs', 'vars', 'inputs'],
      ['always', 'cancelled', 'success', 'failure'],
      'success()',
      true,
    );
    this['runs-on'] = new Expression(job['runs-on'], ['github', 'needs', 'strategy', 'matrix', 'vars', 'inputs']);
    this.environment = new Environment(job.environment);
    this.concurrency = new Expression(job.concurrency, ['github', 'needs', 'strategy', 'matrix', 'vars', 'inputs']);
    this.outputs = new Expression(job.outputs, ['github', 'needs', 'strategy', 'matrix', 'job', 'runner', 'env', 'vars', 'secrets', 'steps', 'inputs'], [], {});
    this.env = new Expression(job.env, ['github', 'needs', 'strategy', 'matrix', 'vars', 'secrets', 'inputs'], [], {});
    this.defaults = new Defaults(job.defaults);

    this.steps = new Steps(job.steps);

    this['timeout-minutes'] = job['timeout-minutes'];
    this.strategy = new Strategy(job.strategy);
    this['continue-on-error'] = new Expression(job['continue-on-error'], ['github', 'needs', 'strategy', 'vars', 'matrix', 'inputs']);
    this.container = new Container(job.container);
    this.services = Object.fromEntries(Object.entries(job.services || {}).map(([serviceId, service]) => {
      return [serviceId, new Container(service as any)];
    }));

    this.uses = new Uses(job.uses);
    this.with = new Expression(job.with, ['github', 'needs', 'strategy', 'matrix', 'vars', 'inputs']);
    this.secrets = new Expression(job.secrets, ['github', 'needs', 'strategy', 'matrix', 'secrets', 'vars', 'inputs']);
  }

  get id() {
    return this.#id;
  }

  set id(id) {
    this.#id = id;
  }

  get index() {
    return this.#index;
  }

  set index(index) {
    this.#index = index;
  }

  get total() {
    return this.#total;
  }

  set total(total) {
    this.#total = total;
  }

  get Result() {
    return this.#result;
  }

  set Result(result: Needs[string]['result']) {
    this.#result = result;
  }

  get Outputs() {
    return this.#outputs;
  }

  set Outputs(outputs: Record<string, string>) {
    this.#outputs = outputs;
  }

  clone<T extends InstanceType<typeof Job>>(this: T) {
    const cloned = JSON.parse(JSON.stringify(this));
    cloned.id = this.#id;
    return new (this.constructor as any)(cloned) as T;
  }

  // 展开作业矩阵
  spread() {
    // @todo use selectMatrices()
    const matrices = this.strategy.Matrices;
    // if (matrices.length === 0) {
    //   return [this];
    // }
    return matrices.map((matrix, index) => {
      const job = this.clone();
      const { name } = job;

      job.index = index;
      job.total = matrices.length;

      // console.log('first', name.source?.includes('${{'));
      // console.log('first', !name.scopes.includes('}}'))
      if (!name.source?.includes('${{') || !name.source.includes('}}')) {
        job.name.source = `${name.source || job.id}${Object.values(matrix).length > 0 ? ` (${Object.values(matrix).join(', ')})` : ''}`;
      }

      job.strategy.matrix = Object.entries(matrix).reduce((accu, [key, value]) => {
        accu[key] = [value];
        return accu;
      }, {} as Record<string, unknown[]>);
      return job;
    });
  }

  get Needs() {
    if (!this.needs) {
      return [];
    }
    return typeof this.needs === 'string' ? [this.needs] : this.needs;
  }

  runsOn(runner: Runner) {
    const runsOn = this['runs-on'].evaluate(runner);
    if (!runsOn) {
      return [];
    }

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

  // job executor
  executor(runner: Runner) {
    // this.resolveNeeds(runner);
    this.resolveInputs(runner);
    this.resolveSecrets(runner);

    const usesExecutor = this.uses.executor(runner);
    if (usesExecutor) {
      return usesExecutor;
    }

    // const { steps } = this;
    // if (!steps || steps.length === 0) {
    //   return Executor.Debug('No steps found');
    // }

    // const stepPrePipeline: Executor[] = [];
    // const stepMainPipeline: Executor[] = [];
    // const stepPostPipeline: Executor[] = [];

    // stepPrePipeline.push(new Executor(() => {
    //   logger.info('Todo:', 'Job env Interpolate');
    // }));

    // stepMainPipeline.push(new Executor(() => {
    //   logger.info('\u{0001F9EA} Matrix:', this.strategy.Matrices);
    // }));

    // stepMainPipeline.push(...steps.map((step, index) => {
    //   // eslint-disable-next-line no-param-reassign
    //   step.number = index;

    //   stepPrePipeline.push(step.Pre);
    //   stepPostPipeline.unshift(step.Post);

    //   return new Executor(async () => {
    //     console.log('');
    //     console.log('step', step.constructor.name);
    //     // console.log('step if:', step.if.evaluate(runner));

    //     console.log(`${runner.run.name} - step:`, step.Name(runner));
    //     // console.log('step uses:', step.uses);
    //     // console.log('step env:', step.Env(runner));
    //     console.log('step with:', step.with.evaluate(runner));

    //     await asyncFunction(0);
    //   }).finally(step.Main);
    // }));

    return Executor.Pipeline(
      runner.startContainer(),
      this.steps.run(),
      new Executor((ctx) => {
        // job post executor
        if (!ctx) {
          return;
        }

        const { jobId, workflow } = runner.run;
        // jobs 之间共享数据
        workflow.jobs[jobId].Outputs = this.outputs?.evaluate(ctx);

        if (runner.caller) {
          const jobsContext = Object.fromEntries(Object.entries(workflow.jobs).map(([jobId2, job]) => {
            return [jobId2, {
              outputs: job.Outputs,
              result: job.Result,
            }];
          }));

          const outputs = Object.fromEntries(Object.entries(workflow.workflowCall()?.outputs || {}).map(([outputId, output]) => {
            let value = '';
            try {
              value = output.value.evaluate(runner, { jobs: jobsContext });
            } catch (err) {
              console.log('err', err);
            }
            return [outputId, value];
          }));

          // eslint-disable-next-line no-param-reassign
          runner.caller.run.workflow.jobs[runner.caller.run.jobId].Outputs = outputs;
        }
      }),
      runner.stopContainer(),
    );
  }

  resolveNeeds(runner: Runner) {
    const { jobs } = runner.run.workflow;
    const needs = this.Needs.map((jobId) => {
      const job = jobs[jobId];
      return [jobId, {
        outputs: job.Outputs,
        result: job.Result,
      }];
    });

    // eslint-disable-next-line no-param-reassign
    runner.context.needs = Object.fromEntries(needs);
  }

  // eslint-disable-next-line class-methods-use-this
  resolveInputs(runner: Runner) {
    if (runner.caller) {
      const { workflow } = runner.run;
      const callerJobWith = runner.caller.run.workflow.jobs[runner.caller.run.jobId].with.evaluate(runner.caller) || {};

      const result = Object.entries(workflow.workflowCall()?.inputs || {}).map(([inputId, input]) => {
        const value = callerJobWith[inputId];
        return [inputId, value || input.default.evaluate(runner)];
      });

      const inputs = Object.fromEntries(result);

      // eslint-disable-next-line no-param-reassign
      runner.context.inputs = inputs;
    }
  }

  /**
   * The workflow is not valid. ${workflow_path} (Line: 11, Col: 11): Secret ${secret_key} is required, but not provided while calling.
   *
   */
  // eslint-disable-next-line class-methods-use-this
  resolveSecrets(runner: Runner) {
    if (runner.caller) {
      const { workflow } = runner.run;
      const callerJobSecrets = runner.caller.run.workflow.jobs[runner.caller.run.jobId].secrets.evaluate(runner.caller) || {};
      if (callerJobSecrets === 'inherit') {
        return;
      }

      const callerJobSecretKeys = Object.keys(callerJobSecrets);

      const result = Object.entries(workflow.workflowCall()?.secrets || {}).map(([secretId, secret]) => {
        if (secret.required && !callerJobSecretKeys.includes(secretId)) {
          throw Error(`Secret ${secretId} is required, but not provided while calling.`);
        }

        const value = callerJobSecrets[secretId];

        return [secretId, value];
      });

      const secrets = Object.fromEntries(result);

      // eslint-disable-next-line no-param-reassign
      runner.context.secrets = secrets;
    }
  }

  // static SetupSteps(steps: StepProps[] = []) {
  //   const map = new Map<string, number>();

  //   return steps.map((step) => {
  //     const id = (step.run ? '__run' : step.id) || createSafeName(step.uses || '');
  //     let oN = map.get(id) || 0;
  //     if (map.has(id)) {
  //       oN += 1;
  //       map.set(id, oN);
  //     } else {
  //       map.set(id, 0);
  //     }

  //     const stepId = oN === 0 ? id : `${id}_${oN}`;
  //     Object.assign(step, { id: stepId });
  //     return StepActionFactory.create(step);
  //   });
  // }
}

export default Job;
