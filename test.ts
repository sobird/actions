import _ from 'lodash';

_.templateSettings.interpolate = /\${{([\s\S]+?)}}/g;
_.templateSettings.imports = {

  test(val: unknown) {
    console.log('val', val);
    return val;
  },
};

const expression = '${{ {name: "sobird"} }}';
const str = JSON.stringify(expression);

console.log('str', str);

const compile = _.template(expression);
const output = compile({});

console.log('output', output);
