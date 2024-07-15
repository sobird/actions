/* eslint-disable no-template-curly-in-string */
/**
 * Expressions
 * 表达式在运行时进行计算取值
 *
 * @see https://docs.github.com/en/actions/learn-github-actions/expressions
 *
 * sobird<i@sobird.me> at 2024/05/17 1:36:37 created.
 */

import _ from 'lodash';

import Runner from '@/pkg/runner';
import Job from '@/pkg/workflow/job';

import functions from './functions';

_.templateSettings.interpolate = /\${{([\s\S]+?)}}/g;
_.templateSettings.imports = {
  ...functions,
};

class Expression<T> {
  constructor(
    public source: T,
    public scopes: string[],
    public specials: string[] = [],
    public defaultValue: unknown = undefined,
    public isIf: boolean = false,
    public type: string = 'job',
  ) {}

  evaluate(runner: Runner): T {
    const { context } = runner;
    const interpret = (source: unknown): any => {
      if (source === null) {
        return null;
      }
      if (source === undefined) {
        return undefined;
      }
      if (typeof source === 'boolean') {
        return source;
      }
      if (typeof source === 'string') {
        let expression = source;
        if (this.isIf && (!source.includes('${{') || !source.includes('}}'))) {
          expression = `\${{ ${source} }}`;
        }
        expression = expression.replace(/((?:\w+\.)*?\w+)\.\*\.(\w+)/g, "objectFilter($1, '$2')");
        const availability = _.pick(context, ...this.scopes);

        // expression = this.getHashFilesFunction(expression);

        const template = _.template(expression);

        try {
          const output = template({
            ...availability,
            ...this.getSpecialFunctions(runner),
          });

          if (output === 'true') {
            return true;
          }
          if (output === 'false') {
            return false;
          }
          return output;
        } catch (err) {
          return '';
        }
      }

      if (Array.isArray(source)) {
        return source.map((item) => {
          return interpret(item);
        });
      }

      // object
      const output: Record<string, unknown> = {};
      _.forOwn(source, (item, key) => {
        output[key] = interpret(item);
      });
      return output;
    };

    return interpret(this.source || this.defaultValue);
  }

  toString() {
    return this.source;
  }

  toJSON() {
    return this.source;
  }

  getSpecialFunctions(runner: Runner) {
    const fns: Record<string, Function> = {};
    this.specials.forEach((name) => {
      switch (name) {
        case 'hashFiles':
          fns.hashFiles = Expression.CreateHashFilesFunction(runner);
          break;
        case 'success':
          if (this.type === 'job') {
            fns.success = Expression.CreateJobSuccess(runner);
          } else if (this.type === 'step') {
            fns.success = Expression.CreateStepSuccess(runner);
          }
          break;
        case 'failure':
          if (this.type === 'job') {
            fns.failure = Expression.CreateJobFailure(runner);
          } else if (this.type === 'step') {
            fns.failure = Expression.CreateStepFailure(runner);
          }
          break;
        case 'cancelled':
          fns.cancelled = Expression.CreateCancelled(runner);
          break;
        default:
      }
    });

    return fns;
  }

  // todo use container exec
  static CreateHashFilesFunction(runner: Runner) {
    return (...patterns: string[]) => {
      return runner.container?.hashFiles(...patterns);
    };
  }

  private static CreateJobSuccess(runner: Runner) {
    return () => {
      const { workflow, job } = runner.run;
      const jobNeeds = this.JobNeedsTransitive(job, runner);

      for (const need of jobNeeds) {
        if (workflow.jobs[need].result !== 'success') {
          return true;
        }
      }

      return true;
    };
  }

  private static JobNeedsTransitive(job: Job, runner: Runner) {
    if (!job) {
      return [];
    }
    const { workflow } = runner.run;
    let needs = job.getNeeds();

    for (const need of needs) {
      const parentNeeds = this.JobNeedsTransitive(workflow.jobs[need], runner);
      needs = needs.concat(parentNeeds);
    }

    return needs;
  }

  static CreateStepSuccess(runner: Runner) {
    return () => {
      console.log('121', runner.context.job.status);
      return runner.context.job.status === 'success';
    };
  }

  static CreateJobFailure(runner: Runner) {
    return () => {
      const { workflow, job } = runner.run;
      const jobNeeds = this.JobNeedsTransitive(job, runner);

      for (const need of jobNeeds) {
        if (workflow.jobs[need].result === 'failure') {
          return true;
        }
      }

      return false;
    };
  }

  static CreateStepFailure(runner: Runner) {
    return () => {
      return runner.context.job.status === 'failure';
    };
  }

  static CreateCancelled(runner: Runner) {
    return () => {
      return runner.context.job.status === 'cancelled';
    };
  }
}

export default Expression;

// const express = new Expression('${{ { status: "success" } }}', []);
// const result = express.evaluate({});

// console.log('ddd', result);
