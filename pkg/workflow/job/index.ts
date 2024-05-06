/* eslint-disable no-underscore-dangle */
/**
 * Job is the structure of one job in a workflow
 *
 * sobird<i@sobird.me> at 2024/05/02 20:26:29 created.
 */
import Container from './container';
import Step from './step';
import Strategy from './strategy';
import {
  WorkflowDispatchInputs, Permissions, Concurrency, Defaults,
} from '../types';

class Job {
  /**
   * 使用 jobs.<job_id>.name 设置作业名称，该名称显示在 GitHub UI 中。
   */
  name: string;

  /**
   * 在特定的作业中，你可以使用 `jobs.<job_id>.permissions` 修改授予 `GITHUB_TOKEN` 的默认权限，
   * 根据需要添加或删除访问权限，以便只授予所需的最低访问权限。
   */
  permissions?: Permissions;

  _needs?: string[];

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

  strategy?: Strategy;

  'continue-on-error': boolean;

  container?: string | Container;

  services?: Record<string, Container>;

  uses?: string;

  with?: Record<string, string | WorkflowDispatchInputs>;

  secrets?: Record<string, string> | 'inherit';

  constructor(public job: Job) {
    this.name = job.name;
    this.permissions = job.permissions;
    this._needs = job.needs;
    this.if = job.if;
    this['runs-on'] = job['runs-on'];
    this.environment = job.environment;
    this.concurrency = job.concurrency;
    this.outputs = job.outputs;
    this.env = job.env;
    this.defaults = job.defaults;
    this.steps = job.steps;
    this['timeout-minutes'] = job['timeout-minutes'];
    this.strategy = job.strategy;
    this['continue-on-error'] = job['continue-on-error'];
    this.container = job.container;
    this.services = job.services;
    this.uses = job.uses;
    this.with = job.with;
    this.secrets = job.secrets;
  }

  /**
   * 使用 `jobs.<job_id>.needs` 标识运行此作业之前必须成功完成的所有作业。
   *
   * 它可以是一个字符串，也可以是字符串数组。
   * 如果某个作业失败或跳过，则所有需要它的作业都会被跳过，除非这些作业使用让该作业继续的条件表达式。
   * 如果运行包含一系列相互需要的作业，则故障或跳过将从故障点或跳过点开始，应用于依赖项链中的所有作业。
   * 如果希望某个作业在其依赖的作业未成功时也能运行，请在 `jobs.<job_id>.if` 中使用 `always()` 条件表达式。
   */
  get needs() {
    return typeof this._needs === 'string' ? [this._needs] : this._needs;
  }

  set needs(needs) {
    this._needs = needs;
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
}

export default Job;
