/* eslint-disable max-classes-per-file */
import fs from 'node:fs';
import path from 'node:path';

import Action from './pkg/runner/action';

const action = Action.Read('/Users/sobird/.cache/act/actions-checkout@v4/action.yml');
const acton2 = Action.Load('');
console.log('action', action.dump());

console.log('path', path.resolve('/usr', 'bin1'));
const stat = fs.accessSync(path.resolve('/usr', 'bin'));
console.log('stat', stat);

class BaseClass {
  static create<T extends typeof BaseClass>(this: T): InstanceType<T> {
    return new this();
  }
}

class DerivedClass extends BaseClass {
  // DerivedClass 特有的属性或方法
}

const baseInstance = BaseClass.create();
console.log(baseInstance instanceof BaseClass); // 输出: true

const derivedInstance = DerivedClass.create();
console.log(derivedInstance instanceof DerivedClass); // 输出: true
