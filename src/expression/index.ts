/**
 * Expressions
 * 表达式在运行时进行计算取值
 *
 * @see https://docs.github.com/en/actions/learn-github-actions/expressions
 *
 * sobird<i@sobird.me> at 2024/05/17 1:36:37 created.
 */

import { pick, template, isObject, forOwn } from 'lodash-es';

import Runner from '@/runner';
import Context from '@/runner/context';
import Job from '@/workflow/job';

import functions, { Special } from './functions';

/**
 * The contexts an expression may read from, mirroring the properties of {@link Context}.
 */
export type Scope =
  | 'github'
  | 'env'
  | 'vars'
  | 'job'
  | 'jobs'
  | 'steps'
  | 'runner'
  | 'secrets'
  | 'strategy'
  | 'matrix'
  | 'needs'
  | 'inputs';

class Expression<T> {
  constructor(
    public source: T,
    public scopes: Scope[],
    public specials: Special[] = [],
    public defaultValue: unknown = '',
    public isIf: boolean = false,
    public type: string = 'job',
  ) {}

  /**
   * Interpolate the expression.
   *
   * `ctx` lets a caller with no runner — the server reading `runs-on` before any
   * runner exists — supply the contexts itself. `runner` is then only reached for
   * the special functions, so an expression declaring none may leave it out.
   */
  evaluate(runner?: Runner, ctx?: Partial<Context>): T {
    const context = ctx || runner!.context;
    const interpret = (source: unknown): any => {
      if (typeof source === 'boolean') {
        return source;
      }

      if (typeof source === 'string') {
        let expression = source;
        if (this.isIf && (!source.includes('${{') || !source.includes('}}'))) {
          expression = `\${{ ${source} }}`;
        }

        if (typeof expression === 'string' && expression.length < 1000) {
          expression = expression.replace(/([\w.]+)\.\*\.(\w+)/g, (match, p1, p2) => {
            return `objectFilter(${p1}, '${p2}')`;
          });

          expression = expression.replace(/(?:[a-zA-Z_]+)(?:\.[a-zA-Z_][\w-]*-[\w-]+)/g, (a) => {
            const [first, ...parts] = a.split('.');
            const output = parts.map((item) => {
              return `['${item}']`;
            });
            output.unshift(first);
            return output.join('');
          });
        }

        const availability = pick(context, ...this.scopes);

        // expression = this.getHashFilesFunction(expression);

        try {
          const templateExecutor = template(expression, {
            interpolate: /\${{([\s\S]+?)}}/g,
            imports: functions,
          });
          const output = templateExecutor({
            ...availability,
            ...this.getSpecialFunctions(runner!),
          });

          if (output === 'true') {
            return true;
          }
          if (output === 'false') {
            return false;
          }
          return output;
        } catch (error) {
          // todo
          throw new Error((error as Error).message, { cause: error });
        }
      }

      if (Array.isArray(source)) {
        return source.map((item) => {
          return interpret(item);
        });
      }

      if (isObject(source)) {
        const output: Record<string, unknown> = {};
        forOwn(source, (item, key) => {
          output[key] = interpret(item);
        });
        return output;
      }

      return source;
    };

    return interpret(this.source ?? this.defaultValue);
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
        case 'always':
          fns.always = () => true;
          break;
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
          return false;
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

  /**
   * Status functions read the composite's own result for embedded main steps, and the
   * job's status for pre, post and job-level steps.
   *
   * @see https://github.com/actions/runner/blob/main/src/Runner.Worker/Expressions/SuccessFunction.cs
   */
  private static IsCompositeMainStep(runner: Runner) {
    return runner.isEmbedded && runner.stage === 'Main';
  }

  /** `github.action_status` carries the composite's result so far; unset reads as success. */
  private static CompositeStatus(runner: Runner) {
    return runner.context.github.action_status || 'success';
  }

  static CreateStepSuccess(runner: Runner) {
    return () => {
      if (Expression.IsCompositeMainStep(runner)) {
        return Expression.CompositeStatus(runner) === 'success';
      }

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
      if (Expression.IsCompositeMainStep(runner)) {
        return Expression.CompositeStatus(runner) === 'failure';
      }

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
