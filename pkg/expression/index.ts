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

_.templateSettings.interpolate = /\${{([\s\S]+?)}}/g;
_.templateSettings.imports = {
  getName(name) {
    return `ddd${name}`;
  },
  test: 'ddd111',
};

class Test {
  list = [
    { name: 'test' },
  ];

  constructor(public name: string = 'test') {

  }

  getName() {
    return this.name;
  }
}
const test = new Test('hello');

const compiled = _.template('The ${{test}} job was automatically triggered by a ${{ getName() }} event.');
const result = compiled();
console.log('result:', result);
