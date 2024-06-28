/* eslint-disable max-classes-per-file */
class Context {
  constructor(public name: string, public msg: string) {}
}

class Child {
  constructor(public name: string, public context: Context) {}
}

class Parent {
  context: Context;

  child: Child;

  constructor(public name: string, public age: number) {
    this.context = new Context('context', 'hello context');
    this.child = new Child('child', this.context);
  }
}

const p = new Parent('parent', 32);
console.log('parent', p.context === p.child.context);
