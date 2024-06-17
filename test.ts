import fs from 'node:fs';

import Action from './pkg/runner/action';

const action = Action.Read('/Users/sobird/.cache/act/actions-checkout@v4/action.yml');
console.log('action', action.dump());

const stat = fs.statSync('/');
console.log('stat', stat.isFile());
