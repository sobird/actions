class Parent {
  constructor(public name: string) {}

  getName() {
    return this.name;
  }

  get test() {
    return this.name;
  }
}

const p = new Parent('sobird');
const p1 = structuredClone(p);

console.log('p', p.test);
console.log('p1', Object.keys(p1));
