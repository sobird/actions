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

  evaluate(context: DeepPartial<Context> = {}): T {
    const text = JSON.stringify(this.source);
    const expression = text.replace(/((?:\w+\.)*?\w+)\.\*\.(\w+)/g, "objectFilter($1, '$2')");

    console.log('expression', expression, this.source);

    const output = _.template(expression)(_.pick(context, ...this.scopes));

    console.log('output', output);

    try {
      return JSON.parse(output);
    } catch (err) {
      return output as T;
    }
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
