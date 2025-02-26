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
import Context from '@/pkg/runner/context';
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

  evaluate(runner: Runner, ctx?: Partial<Context>): T {
    const context = ctx || runner.context;
    const interpret = (source: unknown): any => {
      if (typeof source === 'string') {
        let expression = source;
        if (this.isIf && (!source.includes('${{') || !source.includes('}}'))) {
          expression = `\${{ ${source} }}`;
        }

        expression = expression.replace(/((?:\w+\.)*?\w+)\.\*\.(\w+)/g, "objectFilter($1, '$2')");

        expression = expression.replace(/(?:[a-zA-Z_]+)(?:\.[a-zA-Z_][\w-]*-[\w-]+)/g, (a) => {
          const [first, ...parts] = a.split('.');
          const output = parts.map((item) => {
            return `['${item}']`;
          });
          output.unshift(first);
          return output.join('');
        });

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
          // todo
          throw new Error((err as Error).message);
        }
      }

      if (Array.isArray(source)) {
        return source.map((item) => {
          return interpret(item);
        });
      }

      if (_.isObject(source)) {
        const output: Record<string, unknown> = {};
        _.forOwn(source, (item, key) => {
          output[key] = interpret(item);
        });
        return output;
      }

      return source;
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
          if (this.type === 'step') {
            fns.success = Expression.CreateStepSuccess(runner);
          } else {
            fns.success = Expression.CreateJobSuccess(runner);
          }
          break;
        case 'failure':
          if (this.type === 'step') {
            fns.failure = Expression.CreateStepFailure(runner);
          } else {
            fns.failure = Expression.CreateJobFailure(runner);
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
        if (workflow.jobs[need].Result !== 'success') {
          return true;
        }
      }

      if (!runner.context.job.status) {
        return true;
      }

      return runner.context.job.status === 'success';
    };
  }

  private static JobNeedsTransitive(job: Job, runner: Runner) {
    if (!job) {
      return [];
    }
    const { workflow } = runner.run;
    let needs = job.Needs;

    for (const need of needs) {
      const parentNeeds = this.JobNeedsTransitive(workflow.jobs[need], runner);
      needs = needs.concat(parentNeeds);
    }

    return needs;
  }

  static CreateStepSuccess(runner: Runner) {
    return () => {
      return runner.context.job.status === 'success';
    };
  }

  static CreateJobFailure(runner: Runner) {
    return () => {
      const { workflow, job } = runner.run;
      const jobNeeds = this.JobNeedsTransitive(job, runner);
      for (const need of jobNeeds) {
        if (workflow.jobs[need].Result === 'failure') {
          return true;
        }
      }

      return runner.context.job.status === 'failure';
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
