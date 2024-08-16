import rc from 'rc';

const config = rc('actions', {
  test: 'sobird',
  age: 32,
}, null, (content) => {
  console.log('content', content);

  return {
    hello: 'world',
  };
});
console.log('config', config);

config.newProperty = 'newValue';
config.existingProperty = 'updateValue';

const updatedConfig = rc('myapp');
console.log('config', updatedConfig, rc);
