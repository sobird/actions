/**
 * Workflow is the structure of the files in .github/workflows
 *
 * @see https://docs.github.com/zh/actions/using-workflows/workflow-syntax-for-github-actions
 *
 * sobird<i@sobird.me> at 2024/05/02 21:27:38 created.
 */

import On from './on';
import Permissions from './permissions';

class Workflow {
  public name: string;

  public 'run-name'?: string;

  public on: On;

  public permissions: Permissions | string;

  public env: Map<string, string>;

  public defaults: any;

  public concurrency: any;

  public jobs: any;

  constructor({
    name, 'run-name': runName, on, permissions, env, defaults, concurrency, jobs,
  }: Workflow) {
    this.name = name;
    this['run-name'] = runName;
    this.on = new On(on);
    this.permissions = permissions;
    this.env = env;
    this.defaults = defaults;
    this.concurrency = concurrency;
    this.jobs = jobs;
  }

  get runName() {
    return this['run-name'];
  }

  set runName(runName) {
    this['run-name'] = runName;
  }

  toJSON() {
    const { name } = this;
    return {
      name,
    };
  }
}

export default Workflow;
