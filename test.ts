const hello = 'aa.bb.cc-dd.ee';

const parts = hello.split('.');
console.log('parts', parts);

const result = hello.replace(/((?:\w+\.)+\.*)/g, (a, b) => {
  console.log('a', a, b);

  return 123;
});

console.log('result', result);
