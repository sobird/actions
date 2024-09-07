import * as tar from 'tar';

function test() {
  for (let i = 0; i < 10; i++) {
    if (i === 5) {
      return i;
    }
  }
}

console.log('test', test());
