/**
 * github context
 * Each job has a Context instance
 *
 * @see https://docs.github.com/en/actions/learn-github-actions/contexts#github-context
 * @see https://github.com/actions/runner/blob/main/src/Runner.Worker/GitHubContext.cs
 *
 * sobird<i@sobird.me> at 2024/05/07 19:42:02 created.
 */

import { Env } from './env';
import { Github } from './github';
import { Inputs } from './inputs';
import { Job } from './job';
import { Jobs } from './jobs';
import { Matrix } from './matrix';
import { Needs } from './needs';
import { Runner } from './runner';
import { Secrets } from './secrets';
import Step from './step';
import { Strategy } from './strategy';
import { Vars } from './vars';

/**
 * Contexts are a way to access information about workflow runs, variables, runner environments, jobs, and steps.
 * Each context is an object that contains properties, which can be strings or other objects.
 *
 * Contexts, objects, and properties will vary significantly under different workflow run conditions.
 * For example, the matrix context is only populated for jobs in a {@link https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idstrategymatrix matrix}.
 *
 * You can access contexts using the expression syntax. For more information, see "{@link https://docs.github.com/en/actions/learn-github-actions/expressions Expressions}."
 *
 * ```yaml
 * ${{ <context> }}
 * ```
 *
 * ***Warning:*** When creating workflows and actions, you should always consider whether your code might execute untrusted input from possible attackers.
 * Certain contexts should be treated as untrusted input, as an attacker could insert their own malicious content.
 * For more information, see "{@link https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions#understanding-the-risk-of-script-injections Security hardening for GitHub Actions}."
 */
export default class Context {
  github: Github;

  env: Env;

  vars: Vars;

  job: Job;

  jobs: Jobs;

  /**
   * The `steps` context contains information about the steps in the current job that have an {@link https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idstepsid `id`} specified and have already run.
   *
   * This context changes for each step in a job. You can access this context from any step in a job.
   *
   * @example
   * ```json
   * {
   *   "checkout": {
   *     "outputs": {},
   *     "outcome": "success",
   *     "conclusion": "success"
   *   },
   *   "generate_number": {
   *     "outputs": {
   *       "random_number": "1"
   *     },
   *     "outcome": "success",
   *     "conclusion": "success"
   *   }
   * }
   * ```
   */
  steps: Record<string, Step>;

  runner: Runner;

  secrets: Secrets;

  strategy: Strategy;

  matrix: Matrix;

  needs: Needs;

  inputs: Inputs;

  constructor(context: Context) {
    this.github = new Github(context.github ?? {});
    this.env = context.env ?? {};
    this.vars = context.vars ?? {};
    this.job = new Job(context.job ?? {});
    this.jobs = new Jobs(context.jobs ?? {});
    this.steps = context.steps ?? {};
    this.runner = new Runner(context.runner ?? {});
    this.secrets = context.secrets ?? {};
    this.strategy = new Strategy(context.strategy ?? {});
    this.matrix = context.matrix ?? {};
    this.needs = new Needs(context.needs ?? {});
    this.inputs = context.inputs ?? {};
  }

  test?() {
    return this.env;
  }

  set StepResult(step: Partial<Step>) {
    const { action } = this.github;
    if (!this.steps[action]) {
      this.steps[action] = {
        outputs: {},
        outcome: 'success',
        conclusion: 'success',
      };
    }
    Object.assign(this.steps[action], step);

    if (step.conclusion === 'success' || step.conclusion === 'failure' || step.conclusion === 'cancelled') {
      this.job.status = step.conclusion;
    }
  }

  get StepResult() {
    const { action } = this.github;
    return this.steps[action];
  }
}
