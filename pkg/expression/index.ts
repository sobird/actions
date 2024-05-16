/* eslint-disable no-template-curly-in-string */
/**
 * Expressions
 *
 * @see https://docs.github.com/en/actions/learn-github-actions/expressions
 *
 * sobird<i@sobird.me> at 2024/05/17 1:36:37 created.
 */

import _ from 'lodash';

_.templateSettings.interpolate = /\${{([\s\S]+?)}}/g;

class Test {
  constructor(public name: string = 'test') {

  }

  getName() {
    return this.name;
  }
}
const test = new Test('hello');

const compiled = _.template('The job was automatically triggered by a ${{ getName() }} event.');
const result = compiled(test);
console.log('result:', result);
