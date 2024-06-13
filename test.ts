import Yaml from './pkg/common/yaml';

class Test extends Yaml {
  name: string;

  constructor(test: Test) {
    super(test);
    this.name = test.name;
  }
}

const test = Test.Read('.github/workflows/ci.yml');
console.log('test', test.dump());
