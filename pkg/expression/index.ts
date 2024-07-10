/* eslint-disable no-template-curly-in-string */
/**
 * Expressions
 * 表达式在运行时进行计算取值
 *
 * @see https://docs.github.com/en/actions/learn-github-actions/expressions
 *
 * sobird<i@sobird.me> at 2024/05/17 1:36:37 created.
 */

import { spawnSync } from 'node:child_process';

import _ from 'lodash';

import Runner from '@/pkg/runner';
import Job from '@/pkg/workflow/job';

import functions from './functions';

_.templateSettings.interpolate = /\${{([\s\S]+?)}}/g;
_.templateSettings.imports = {
  ...functions,

  test(val: unknown) {
    console.log('val', val);
    return val;
  },
};

class Expression<T> {
  constructor(public source: T, public scopes: string[], public specials: string[] = []) {}

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
        const expression = source.replace(/((?:\w+\.)*?\w+)\.\*\.(\w+)/g, "objectFilter($1, '$2')");
        const availability = _.pick(context, ...this.scopes);

        // expression = this.getHashFilesFunction(expression);

        const template = _.template(expression);
        const output = template({
          ...availability,
          hashFiles: this.hashFiles,
        });
        console.log('output', output);
        if (output === 'true') {
          return true;
        }
        if (output === 'false') {
          return false;
        }
        return output;
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

    return interpret(this.source);
  }

  toString() {
    return this.source;
  }

  toJSON() {
    return this.source;
  }

  private getHashFilesFunction(source: string) {
    const regexp = /\bhashFiles\s*\(([^)]*)\)/g;
    return source.replaceAll(regexp, (...match) => {
      const paramstr = match[1].replace(/'/g, '"');
      const patterns = JSON.parse(`[${paramstr}]`);

      const hash = this.hashFiles(...patterns);

      return JSON.stringify(hash);
    });
  }

  // todo
  hashFiles(...patterns: string[]) {
    const env = {
      ...process.env,
      patterns: patterns.join('\n'),
    };

    const command = '/Users/sobird/act-runner/pkg/expression/hashFiles/index.cjs';
    const { stdout, stderr } = spawnSync('node', [command], { env, encoding: 'utf8' });
    console.log('stdout', stdout);
    const matches = stderr.match(/__OUTPUT__([a-fA-F0-9]*)__OUTPUT__/g);
    if (matches && matches.length > 0) {
      return matches[0].slice(10, -10);
    }
  }

  private static JobSuccess(runner: Runner) {
    const { workflow, job } = runner.run;
    const jobNeeds = this.JobNeedsTransitive(job, runner);

    for (const need of jobNeeds) {
      if (workflow.jobs[need].result !== 'success') {
        return false;
      }
    }

    return true;
  }

  private static JobNeedsTransitive(job: Job, runner: Runner) {
    const { workflow } = runner.run;

    let needs = job.getNeeds();

    for (const need of needs) {
      const parentNeeds = this.JobNeedsTransitive(workflow.jobs[need], runner);
      needs = needs.concat(parentNeeds);
    }

    return needs;
  }

  static StepSuccess(runner: Runner) {
    return runner.context.job.status === 'success';
  }

  static JobFailure(runner: Runner) {
    const { workflow, job } = runner.run;
    const jobNeeds = this.JobNeedsTransitive(job, runner);

    for (const need of jobNeeds) {
      if (workflow.jobs[need].result === 'failure') {
        return true;
      }
    }

    return false;
  }

  static StepFailure(runner: Runner) {
    return runner.context.job.status === 'failure';
  }

  static Cancelled(runner: Runner) {
    return runner.context.job.status === 'cancelled';
  }
}

export default Expression;

// const express = new Expression('${{ { status: "success" } }}', []);
// const result = express.evaluate({});

// console.log('ddd', result);
