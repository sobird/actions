/* eslint-disable max-classes-per-file */
import fs from 'node:fs';
import path from 'node:path';

import Action from './pkg/runner/action';

const action = Action.Scan('/Users/sobird/.cache/act/actions-checkout@v4/action.yml');

console.log('path', path.resolve('/usr', 'bin1'));
const stat = fs.accessSync(path.resolve('/usr', 'bin'));
console.log('stat', stat);

class Uses {
  constructor(private uses: string) {}

  toString() {
    return this.uses;
  }
}

const uses = new Uses('uses test');
console.log('uses', JSON.stringify(uses));
