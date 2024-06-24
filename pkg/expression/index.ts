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
};

class Expression {
  constructor(public expression: string, public scopes: string[]) {

  }

  evaluate(context: Context) {
    const expression = this.expression.replace(/((\w+\.)+\*\.(\w+))/g, "objectFilter('$1')");
    return _.template(expression)(_.pick(context, ...this.scopes));
  }

  toString() {
    return this.expression;
  }

  toJSON() {
    return this.expression;
  }
}

export default Expression;
