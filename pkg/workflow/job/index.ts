/**
 * Job is the structure of one job in a workflow
 *
 * sobird<i@sobird.me> at 2024/05/02 20:26:29 created.
 */
import Step from './step';

class Job {
  name: string;

  needs: any;

  runsOn: any;

  env: any;

  if: any;

  steps: Step[];

  timeoutMinutes: string;

  services = new Map();

  strategy;

  container;

  defaults;

  outputs;

  uses;

  with;

  secrets;

  constructor(public job: Job) {
    this.name = name;
    this.steps = [];
  }
}

export default Job;
