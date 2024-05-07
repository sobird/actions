/* eslint-disable no-underscore-dangle */
/**
 * Workflow is the structure of the files in .github/workflows
 *
 * @see https://docs.github.com/zh/actions/using-workflows/workflow-syntax-for-github-actions
 *
 * sobird<i@sobird.me> at 2024/05/02 21:27:38 created.
 */

import fs from 'fs';

import yaml, { LoadOptions, DumpOptions } from 'js-yaml';

import Job from './job';
import {
  Concurrency, Defaults, On, OnEvents, Permissions,
} from './types';

class Workflow {
  /**
   * 工作流文件路径
   */
  public file?: string;

  /**
   * 工作流的名称。
   *
   * GitHub 在存储库的“操作”选项卡下显示工作流的名称。
   * 如果省略 name，GitHub 会显示相对于存储库根目录的工作流文件路径。
   */
  public name?: string;

  /**
   * 从工作流生成的工作流运行的名称。
   *
   * GitHub 在存储库的“操作”选项卡上的工作流运行列表中显示工作流运行名称。
   * 如果省略了 run-name 或仅为空格，则运行名称将设置为工作流运行的事件特定信息。
   * 例如，对于由 push 或 pull_request 事件触发的工作流，将其设置为提交消息或拉取请求的标题。
   * 此值可包含表达式，且可引用 github 和 inputs 上下文。
   *
   * @example
   * run-name: Deploy to ${{ inputs.deploy_target }} by @${{ github.actor }}
   */
  public 'run-name'?: string;

  /**
   * 若要自动触发工作流，请使用 on 定义哪些事件可以触发工作流运行。
   *
   * 有关可用事件的列表，请参阅“{@link https://docs.github.com/zh/actions/using-workflows/events-that-trigger-workflows 触发工作流的事件}”。
   * 可以定义单个或多个可以触发工作流的事件，或设置时间计划。
   * 还可以将工作流的执行限制为仅针对特定文件、标记或分支更改。
   *
   * @see https://docs.github.com/zh/actions/using-workflows/workflow-syntax-for-github-actions#on
   */
  public on: On;

  /**
   * 可以使用 `permissions` 修改授予 `GITHUB_TOKEN` 的默认权限，根据需要添加或删除访问权限，以便只授予所需的最低访问权限。
   *
   * 可以使用 `permissions` 作为顶级密钥，以应用于工作流中的所有作业或特定作业。
   * 当你在特定作业中添加 `permissions` 密钥时，该作业中使用 `GITHUB_TOKEN` 的所有操作和运行命令都将获得你指定的访问权限。
   *
   * 对于下表中显示的每个可用范围，可以分配以下权限之一：`read`、`write` 或 `none`。
   * 如果你指定其中任何作用域的访问权限，则所有未指定的作用域都被设置为 `none`。
   *
   * @see https://docs.github.com/zh/actions/using-workflows/workflow-syntax-for-github-actions#permissions
   */
  public permissions: Permissions;

  /**
   * 可用于工作流中所有作业的步骤的变量的 `map`。
   *
   * 还可以设置仅适用于单个作业的步骤或单个步骤的变量。
   * 有关详细信息，请参阅 `jobs.<job_id>.env` 和 `jobs.<job_id>.steps[*].env`。
   */
  public env: object;

  /**
   * 使用 `defaults` 创建将应用于工作流中所有作业的默认设置的 `map`。
   *
   * 您也可以设置只可用于作业的默认设置。 有关详细信息，请参阅 `jobs.<job_id>.defaults`。
   * 使用相同名称定义了多个默认设置时，GitHub 会使用最具体的默认设置。 例如，在作业中定义的默认设置将覆盖在工作流程中定义的同名默认设置。
   */
  public defaults: Defaults;

  /**
   * 使用 `concurrency` 以确保只有使用相同并发组的单一作业或工作流才会同时运行。
   *
   * 并发组可以是任何字符串或表达式。
   * 表达式只能使用 `github`、`inputs` 和 `vars` 上下文。 有关表达式的详细信息，请参阅“表达式”。
   * 你还可以在作业级别指定 `concurrency`。有关详细信息，请参阅 `jobs.<job_id>.concurrency`。
   */
  public concurrency: Concurrency;

  /**
   * 工作流运行由一个或多个 `jobs` 组成，默认情况下并行运行。
   *
   * 若要按顺序运行作业，可以使用 `jobs.<job_id>.needs` 关键字定义对其他作业的依赖关系。
   * 每个作业在 `runs-on` 指定的运行器环境中运行。
   */
  public jobs: Record<string, Job>;

  constructor({
    name, 'run-name': runName, on, permissions, env, defaults, concurrency, jobs = {},
  }: Workflow) {
    this.name = name;
    this['run-name'] = runName;
    this.on = on;
    this.permissions = permissions;
    this.env = env;
    this.defaults = defaults;
    this.concurrency = concurrency;
    this.jobs = Object.fromEntries(Object.entries(jobs).map(([jobId, job]) => {
      this.validateJobId(jobId);
      return [jobId, new Job(job)];
    }));
  }

  /**
   * get on event list
   */
  onEvents() {
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

  get workflowDispatch(): Record<string, OnEvents['workflow_dispatch']['inputs']> | undefined | OnEvents['workflow_dispatch'] {
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

  validateJobId(jobId: string) {
    const jobIdRegex = /^[A-Za-z_][A-Za-z0-9_-]*$/;

    if (!jobIdRegex.test(jobId)) {
      // 如果作业名不符合正则表达式规则，抛出错误
      throw new Error(
        `Workflow is not valid. '${this.name}': Job name '${jobId}' is invalid. Names must start with a letter or '_' and contain only alphanumeric characters, '-', or '_'`,
      );
    }
  }

  stages(...jobIds: string[]) {
    const jobNeeds: Record<string, string[]> = {};

    let jobIdsClone = [...jobIds];

    if (jobIds.length === 0) {
      jobIdsClone = Object.keys(this.jobs);
    }

    while (jobIdsClone.length > 0) {
      const newjobIds: string[] = [];
      jobIdsClone.forEach((jobId) => {
        if (!jobNeeds[jobId]) {
          const job = this.jobs[jobId];
          if (job) {
            jobNeeds[jobId] = job.needs;
            newjobIds.push(...job.needs);
          }
        }
      });
      jobIdsClone = newjobIds;
    }

    const stages: Array<{ job: Job, jobId: string }[]> = [];
    // return true if all strings in jobIds exist in at least one of the stages
    // eslint-disable-next-line @typescript-eslint/no-shadow
    const jobIdsInStages = (jobIds: string[], ...stages: Array<{ job: Job, jobId: string }[]>) => {
      for (const jobId of jobIds) {
        let found = false;
        for (const runs of stages) {
          if (runs.map((run) => { return run.jobId; }).includes(jobId)) {
            found = true;
          }
        }
        if (!found) return false;
      }
      return true;
    };
    while (Object.keys(jobNeeds).length > 0) {
      const runs: { job: Job, jobId: string }[] = [];

      Object.entries(jobNeeds).forEach(([jobId, needs]) => {
        if (jobIdsInStages(needs, ...stages)) {
          runs.push({
            job: this.jobs[jobId],
            jobId,
          });
          delete jobNeeds[jobId];
        }
      });

      if (runs.length === 0) {
        console.log('unable to build dependency graph for');
        break;
      }
      stages.push(runs);
    }

    return stages;
  }

  toJSON() {
    const { file, ...json } = this;
    return json;
  }

  save(path: string, options?: DumpOptions) {
    const doc = yaml.dump(this.toJSON(), options);
    fs.writeFileSync(path, doc);
  }

  dump(options?: DumpOptions) {
    return yaml.dump(JSON.parse(JSON.stringify(this)), options);
  }

  static Read(path: string, options?: LoadOptions) {
    const doc = yaml.load(fs.readFileSync(path, 'utf8'), options);
    return new Workflow(doc as Workflow);
  }

  static Load(str: string, options?: LoadOptions) {
    const doc = yaml.load(str, options);
    return new Workflow(doc as Workflow);
  }
}

export default Workflow;
