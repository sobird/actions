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

        const template = _.template(expression);
        const output = template(availability);
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

  private hashFiles() {
    //
  }

  private jobSuccess(runner: Runner) {
    const { workflow, job } = runner.run;
    const jobNeeds = this.getNeedsTransitive(job, runner);

    for (const need of jobNeeds) {
      if (workflow.jobs[need].result !== 'success') {
        return [false, null];
      }
    }

    return [true, null];
  }

  private getNeedsTransitive(job: Job, runner: Runner) {
    const { workflow } = runner.run;

    let needs = job.getNeeds();

    for (const need of needs) {
      const parentNeeds = this.getNeedsTransitive(workflow.jobs[need], runner);
      needs = needs.concat(parentNeeds);
    }

    return needs;
  }
}

export default Expression;

// const express = new Expression('${{ { status: "success" } }}', []);
// const result = express.evaluate({});

// console.log('ddd', result);
