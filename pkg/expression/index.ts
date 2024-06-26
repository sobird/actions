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
  constructor(public source: T, public scopes: string[]) {
    this.source = source;
  }

  evaluate(context: DeepPartial<Context> = {}, runner?: Runner): T {
    const interpret = (source: unknown): any => {
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
}

export default Expression;

// const express = new Expression('${{ { status: "success" } }}', []);
// const result = express.evaluate({});

// console.log('ddd', result);
