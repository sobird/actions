/* eslint-disable max-classes-per-file */
import Context from './pkg/runner/context';

const context = new Context({
  github: {
    action: 'action',
  },
});
console.log('context', context);

class Parent {
  public readonly name: string;

  constructor(parent: Parent) {
    this.name = parent.name;
  }
}

class Child {
  name: string;

  parent: Parent;

  constructor(child: Child) {
    this.name = child.name;
    this.parent = child.parent;
    Object.assign(this, child);
  }

  private getName() {
    return this.name;
  }
}

const child = new Child({
  name: 'child',
  parent: {
    name: 'parent',
  },
});

console.log('child', child.getAge());

interface Config {
  readonly name: string
}

const config: Config = {
  name: 'sobird',
};

config.name = 'ddd';
