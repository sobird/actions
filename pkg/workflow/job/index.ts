/* eslint-disable no-underscore-dangle */
/**
 * Job is the structure of one job in a workflow
 *
 * sobird<i@sobird.me> at 2024/05/02 20:26:29 created.
 */
import log4js from 'log4js';

import Executor from '@/pkg/common/executor';
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

class Job {
  /**
   * 使用 `jobs.<job_id>.name` 设置作业名称，该名称显示在 GitHub UI 中。
   */
  name: string;

  /**
   * 在特定的作业中，你可以使用 `jobs.<job_id>.permissions` 修改授予 `GITHUB_TOKEN` 的默认权限，
   * 根据需要添加或删除访问权限，以便只授予所需的最低访问权限。
   */
  permissions?: Permissions;

  #needs?: string[];

  if?: string | boolean;

  /**
   * 使用 `jobs.<job_id>.runs-on` 定义要运行作业的计算机类型。
   *
   * 目标计算机可以是 GitHub 托管的运行器、大型运行器 或 自托管运行器。
   * 你可以根据分配给运行器的标签、其组成员身份或两者的组合来定位运行器。
   *
   * 可以提供以下形式的 runs-on：
   * * 单个字符串
   * * 包含字符串的单个变量
   * * 字符串数组、包含字符串的变量或两者的组合
   * * 使用 group 或 labels 键的 key: value 对
   */
  'runs-on': string | string[] | { group: string;labels: string; };

  environment?: string | {
    name?: string;
    url?: string;
  };

  concurrency?: Concurrency;

  outputs?: Record<string, string>;

  env?: Record<string, string>;

  defaults?: Defaults;

  steps?: Step[];

  'timeout-minutes': number;

  strategy: Strategy;

  'continue-on-error': boolean;

  /**
   * 使用 `jobs.<job_id>.container` 创建用于运行作业中尚未指定容器的任何步骤的容器。
   * 如有步骤同时使用脚本和容器操作，则容器操作将运行为同一网络上使用相同卷挂载的同级容器。
   *
   * 若不设置 `container`，所有步骤将直接在 `runs-on` 指定的主机上运行，除非步骤引用已配置为在容器中运行的操作。
   *
   * 注意：用于容器中的 `run` 步骤的默认 shell 是 `sh`，而不是 `bash`。
   * 这可以使用 `jobs.<job_id>.defaults.run` 或 `jobs.<job_id>.steps[*].shell` 进行替代。
   */
  container: Container;

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

  with?: Record<string, string | WorkflowDispatchInputs>;

  secrets?: Record<string, string> | 'inherit';

  result?: string;

  constructor(job: Job) {
    this.name = job.name;
    this.permissions = job.permissions;
    this.#needs = job.needs;
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
    this.result = job.result;
  }

  /**
   * 使用 `jobs.<job_id>.needs` 标识运行此作业之前必须成功完成的所有作业。
   *
   * 它可以是一个字符串，也可以是字符串数组(此处统一为字符串数组)。
   * 如果某个作业失败或跳过，则所有需要它的作业都会被跳过，除非这些作业使用让该作业继续的条件表达式。
   * 如果运行包含一系列相互需要的作业，则故障或跳过将从故障点或跳过点开始，应用于依赖项链中的所有作业。
   * 如果希望某个作业在其依赖的作业未成功时也能运行，请在 `jobs.<job_id>.if` 中使用 `always()` 条件表达式。
   */
  get needs() {
    if (!this.#needs) {
      return [];
    }
    return typeof this.#needs === 'string' ? [this.#needs] : this.#needs;
  }

  set needs(needs) {
    this.#needs = needs;
  }

  get runsOn() {
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

  set runsOn(runsOn) {
    this['runs-on'] = runsOn;
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

  executor() {
    const { strategy } = this;
    const stageExecutor: Executor[] = [];

    const matrices = strategy.select({});
    logger.debug('Final matrix after applying user inclusions', matrices);

    const maxParallel = Math.min(strategy['max-parallel'] || 4, matrices.length);
    console.log('maxParallel', maxParallel);

    matrices.forEach((matrix) => {
      logger.debug('matrix: %v', matrix);
    });

    // todo 处理 Context, strategy 和 matrix

    // todo
    return Executor.parallel(3, ...stageExecutor);
  }
}

export default Job;
