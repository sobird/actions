import _ from 'lodash';

// const compiled = _.template('<%= user %>');
// const result = compiled({ user: true });
// console.log('result', result);

// const compiled = _.template('<% print("hello " + user); %>!');
// const result = compiled({ user: 'barney' });

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

console.log('result', result);
