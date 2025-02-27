/* eslint-disable no-underscore-dangle */
/**
 * Workflow is the structure of the files in .github/workflows
 *
 * @see https://docs.github.com/zh/actions/using-workflows/workflow-syntax-for-github-actions
 *
 * sobird<i@sobird.me> at 2024/05/02 21:27:38 created.
 */

import prompts, { PromptObject, Choice } from 'prompts';

import Yaml from '@/pkg/common/yaml';
import Expression from '@/pkg/expression';

import Job, { JobProps } from './job';
import Defaults from './job/defaults';
import Plan, { Stage, Run } from './plan';
import {
  Concurrency, On, OnEvents, Permissions, // todo
} from './types';
import WorkflowCall from './workflow_call';

interface WorkflowProps extends Pick<Workflow, 'name' | 'on' | 'permissions' | 'defaults'> {
  file?: string;
  sha?: string;
  'run-name': string;
  concurrency: Concurrency;
  env: Record<string, string>;
  jobs: Record<string, JobProps>;
}

class Workflow extends Yaml {
  #file?: string;

  #sha?: string;

  /**
   * The name of the workflow.
   *
   * GitHub displays the names of your workflows under your repository's "Actions" tab.
   * If you omit `name`, GitHub displays the workflow file path relative to the root of the repository.
   */
  public name?: string;

  /**
   * The name for workflow runs generated from the workflow.
   *
   * GitHub displays the workflow run name in the list of workflow runs on your repository's "Actions" tab. If run-name is omitted or is only whitespace, then the run name is set to event-specific information for the workflow run. For example, for a workflow triggered by a push or pull_request event, it is set as the commit message or the title of the pull request.
   *
   * This value can include expressions and can reference the github and inputs contexts.
   *
   * * Example of run-name
   * ```yaml
   * run-name: Deploy to ${{ inputs.deploy_target }} by @${{ github.actor }}
   * ```
   */
  public 'run-name': Expression<string>;

  /**
   * To automatically trigger a workflow, use on to define which events can cause the workflow to run.
   * For a list of available events, see "{@link https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows Events that trigger workflows}."
   *
   * You can define single or multiple events that can trigger a workflow,
   * or set a time schedule. You can also restrict the execution of a workflow to only occur for specific files, tags, or branch changes.
   */
  public on: On;

  /**
   * You can use `permissions` to modify the default permissions granted to the `GITHUB_TOKEN`, adding or removing access as required, so that you only allow the minimum required access.
   * For more information, see "{@link https://docs.github.com/en/actions/security-guides/automatic-token-authentication#permissions-for-the-github_token Automatic token authentication}."
   *
   * You can use `permissions` either as a top-level key, to apply to all jobs in the workflow, or within specific jobs.
   * When you add the permissions key within a specific job, all actions and run commands within that job that use the `GITHUB_TOKEN` gain the access rights you specify.
   * For more information, see {@link https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idpermissions `jobs.<job_id>.permissions`}.
   *
   * For each of the available scopes, shown in the table below, you can assign one of the permissions: `read`, `write`, or `none`.
   * If you specify the access for any of these scopes, all of those that are not specified are set to `none`.
   */
  public permissions: Permissions;

  /**
   * A map of variables that are available to the steps of all jobs in the workflow.
   * You can also set variables that are only available to the steps of a single job or to a single step.
   * For more information, see {@link https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idenv `jobs.<job_id>.env`} and {@link https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idstepsenv `jobs.<job_id>.steps[*].env`}.
   *
   * Variables in the `env` map cannot be defined in terms of other variables in the map.
   *
   * When more than one environment variable is defined with the same name, GitHub uses the most specific variable.
   * For example, an environment variable defined in a step will override job and workflow environment variables with the same name,
   * while the step executes. An environment variable defined for a job will override a workflow variable with the same name, while the job executes.
   */
  public env: Expression<Record<string, string>>;

  /**
   * Use defaults to create a map of default settings that will apply to all jobs in the workflow.
   * You can also set default settings that are only available to a job.
   * For more information, see {@link https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_iddefaults `jobs.<job_id>.defaults`}.
   *
   * When more than one default setting is defined with the same name, GitHub uses the most specific default setting.
   * For example, a default setting defined in a job will override a default setting that has the same name defined in a workflow.
   */
  public defaults: Defaults;

  /**
   * Use `concurrency` to ensure that only a single job or workflow using the same concurrency group will run at a time.
   * A concurrency group can be any string or expression.
   * The expression can only use `github`, `inputs` and `vars` contexts.
   * For more information about expressions, see "{@link https://docs.github.com/en/actions/learn-github-actions/expressions Expressions}."
   *
   * You can also specify `concurrency` at the job level. For more information, see {@link https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idconcurrency jobs.<job_id>.concurrency}.
   *
   * When a concurrent job or workflow is queued, if another job or workflow using the same concurrency group in the repository is in progress,
   * the queued job or workflow will be pending. Any pending job or workflow in the concurrency group will be canceled.
   * This means that there can be at most one running and one pending job in a concurrency group at any time.
   *
   * To also cancel any currently running job or workflow in the same concurrency group, specify `cancel-in-progress: true`.
   * To conditionally cancel currently running jobs or workflows in the same concurrency group,
   * you can specify `cancel-in-progress` as an expression with any of the allowed expression contexts.
   *
   * **Notes:**
   * * The concurrency group name is case insensitive. For example, `prod` and `Prod` will be treated as the same concurrency group.
   * * Ordering is not guaranteed for jobs or workflow runs using concurrency groups.
   * Jobs or workflow runs in the same concurrency group are handled in an arbitrary order.
   */
  public concurrency: Expression<Concurrency>;

  /**
   * A workflow run is made up of one or more `jobs`, which run in parallel by default.
   * To run jobs sequentially, you can define dependencies on other jobs using the `jobs.<job_id>.needs` keyword.
   *
   * Each job runs in a runner environment specified by `runs-on`.
   *
   * You can run an unlimited number of jobs as long as you are within the workflow usage limits.
   * For more information, see "{@link https://docs.github.com/en/actions/learn-github-actions/usage-limits-billing-and-administration Usage limits, billing, and administration}" for GitHub-hosted runners and "{@link https://docs.github.com/en/actions/hosting-your-own-runners/managing-self-hosted-runners/about-self-hosted-runners#usage-limits About self-hosted runners}" for self-hosted runner usage limits.
   *
   * If you need to find the unique identifier of a job running in a workflow run, you can use the GitHub API.
   * For more information, see "{@link https://docs.github.com/en/rest/actions#workflow-jobs REST API endpoints for GitHub Actions}."
   */
  public jobs: Record<string, Job>;

  #inputs: Record<string, string> = {};

  constructor(workflow: WorkflowProps) {
    super(workflow);

    this.#file = workflow.file;
    this.#sha = workflow.sha;

    this.name = workflow.name;
    this['run-name'] = new Expression(workflow['run-name'], ['github', 'inputs', 'vars']);
    this.on = workflow.on;
    this.permissions = workflow.permissions;
    this.env = new Expression(workflow.env, ['github', 'secrets', 'inputs', 'vars']);
    this.defaults = workflow.defaults;
    this.concurrency = new Expression(workflow.concurrency, ['github', 'inputs', 'vars']);
    this.jobs = this.setupJobs(workflow.jobs);
  }

  private setupJobs(jobs: WorkflowProps['jobs']) {
    if (!jobs) {
      return {};
    }
    return Object.fromEntries(Object.entries(jobs).map(([jobId, job]) => {
      this.validateJobId(jobId);
      const newJob = new Job(job);
      newJob.id = jobId;
      return [jobId, newJob];
    }));
  }

  /** get a job by jobId in the workflow */
  // getJob(id: string) {
  //   return this.jobs[id];
  // }

  /**
  * workflow file name
  */
  get file() {
    return this.#file;
  }

  set file(file) {
    this.#file = file;
  }

  get sha() {
    return this.#sha;
  }

  set sha(sha) {
    this.#sha = sha;
  }

  /**
   * workflow on events
   */
  get events() {
    const { on } = this;
    if (typeof on === 'string') {
      return [on];
    }
    if (Array.isArray(on)) {
      return on;
    }
    return Object.keys(on);
  }

  onEvent<K extends keyof OnEvents>(eventName: K) {
    const { on } = this;
    if (typeof on === 'string') {
      if (on === eventName) {
        return {};
      }
      return;
    }
    if (Array.isArray(on)) {
      if (on.includes(eventName)) {
        return {};
      }
      return;
    }
    return on[eventName] as OnEvents[K];
  }

  validateJobId(jobId: string) {
    const jobIdRegex = /^[A-Za-z_][A-Za-z0-9_-]*$/;

    if (!jobIdRegex.test(jobId)) {
      throw new Error(
        `Workflow is not valid. '${this.name}': Job name '${jobId}' is invalid. Names must start with a letter or '_' and contain only alphanumeric characters, '-', or '_'`,
      );
    }
  }

  /**
   * Obtain the correct job execution order through topological sort(Kahn)
   *
   * Directed Acyclic Graph(DAG)
   */
  sortJobs(...jobIds: string[]) {
    let jobIdsClone = jobIds;
    if (jobIds.length === 0) {
      jobIdsClone = Object.keys(this.jobs);
    }

    // first, build a list of all the necessary jobs to run, and their dependencies
    const jobNeeds: Record<string, string[]> = {};
    while (jobIdsClone.length > 0) {
      const tmpJobIds: string[] = [];
      jobIdsClone.forEach((jobId) => {
        if (!jobNeeds[jobId]) {
          const job = this.jobs[jobId];
          if (job) {
            jobNeeds[jobId] = job.Needs;
            tmpJobIds.push(...job.Needs);
          }
        }
      });
      jobIdsClone = tmpJobIds;
    }

    const queue: { jobId: string, job: Job }[] = [];

    Object.entries(jobNeeds).forEach(([jobId, needs]) => {
      const job = this.jobs[jobId];
      // In degree is 0
      if (needs.length === 0) {
        queue.push({
          jobId,
          job,
        });

        delete jobNeeds[jobId];
      }
    });

    // next, build an execution graph
    let k = 0;
    while (k < queue.length) {
      const zeroNeedsJob = queue[k];
      Object.entries(jobNeeds).forEach(([jobId, needs]) => {
        const newNeeds = needs.filter((need) => { return need !== zeroNeedsJob.jobId; });
        if (newNeeds.length === 0) {
          queue.push({
            jobId,
            job: this.jobs[jobId],
          });
          delete jobNeeds[jobId];
        } else {
          jobNeeds[jobId] = newNeeds;
        }
      });

      k += 1;
    }

    return queue;
  }

  // Job Needs Plan
  plan(...jobIds: string[]) {
    const { jobs } = this;
    const jobNeeds: Record<string, string[]> = {};

    let jobIdsClone = [...jobIds];

    if (jobIds.length === 0) {
      jobIdsClone = Object.keys(jobs);
    }

    while (jobIdsClone.length > 0) {
      const newjobIds: string[] = [];
      jobIdsClone.forEach((jobId) => {
        if (!jobNeeds[jobId]) {
          const job = jobs[jobId];
          if (job) {
            jobNeeds[jobId] = job.Needs;
            newjobIds.push(...job.Needs);
          }
        }
      });
      jobIdsClone = newjobIds;
    }

    const stages: Stage[] = [];
    // return true if all strings in jobIds exist in at least one of the stages
    // eslint-disable-next-line @typescript-eslint/no-shadow
    const jobIdsInStages = (jobIds: string[], ...stages: Stage[]) => {
      for (const jobId of jobIds) {
        let found = false;
        for (const stage of stages) {
          if (stage.runs.map((run) => { return run.jobId; }).includes(jobId)) {
            found = true;
          }
        }
        if (!found) return false;
      }
      return true;
    };
    while (Object.keys(jobNeeds).length > 0) {
      const runs: Run[] = [];

      Object.entries(jobNeeds).forEach(([jobId, needs]) => {
        if (jobIdsInStages(needs, ...stages)) {
          runs.push(new Run(jobId, this));
          delete jobNeeds[jobId];
        }
      });

      if (runs.length === 0) {
        console.log('unable to build dependency graph for');
        break;
      }
      stages.push(new Stage(runs));
    }

    return new Plan(stages);
  }

  clone() {
    const cloned = JSON.parse(JSON.stringify(this));

    cloned.file = this.#file;
    cloned.sha = this.#sha;
    return new Workflow(cloned);
  }

  workflowDispatch(): Record<string, OnEvents['workflow_dispatch']['inputs']> | undefined | OnEvents['workflow_dispatch'] {
    const { on } = this;
    if (typeof on === 'string') {
      if (on === 'workflow_dispatch') {
        return {};
      }
      return;
    }

    if (Array.isArray(on)) {
      if (on.includes('workflow_dispatch')) {
        return {};
      }
      return;
    }

    if (typeof on === 'object') {
      return on.workflow_dispatch;
    }
  }

  workflowCall(): WorkflowCall | undefined {
    const { on } = this;
    if (typeof on === 'string') {
      if (on === 'workflow_call') {
        return new WorkflowCall();
      }
      return;
    }

    if (Array.isArray(on)) {
      if (on.includes('workflow_call')) {
        return new WorkflowCall();
      }
      return;
    }

    if (typeof on === 'object') {
      return new WorkflowCall(on.workflow_call);
    }
  }

  get inputs() {
    return this.#inputs;
  }

  async WorkflowDispatchPrompts(eventName = 'workflow_dispatch') {
    if (eventName === 'workflow_dispatch') {
      const workflowDispatchInputs = this.workflowDispatch()?.inputs || {};

      const questions = Object.entries(workflowDispatchInputs).map(([inputId, input]) => {
        const option: PromptObject = {
          type: 'text',
          name: inputId,
          message: input.description,
          initial: input.default,
        };

        switch (input.type) {
          case 'string':
            option.type = 'text';
            break;
          case 'boolean':
            option.type = 'toggle';
            option.active = 'true';
            option.inactive = 'false';
            break;
          case 'number':
            option.type = 'number';
            break;
          case 'choice':
            option.type = 'select';
            option.choices = input.options?.map((value) => {
              return {
                title: value,
                value,
              } as Choice;
            }) || [];

            option.initial = option.choices.findIndex((item) => {
              return item.value === input.default;
            });

            break;
          case 'environment':
            option.type = 'select';
            break;
          default:
        }
        return option;
      }).filter((item) => {
        return !this.#inputs[item.name as string];
      });

      this.#inputs = await prompts(questions);

      return this.#inputs;
    }

    return {};
  }
}

export default Workflow;
