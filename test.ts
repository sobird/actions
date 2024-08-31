import path from 'path';

import Git from './pkg/common/git';

try {
  const ref = await Git.Ref('/Users/sobird/checkout');
  console.log('ref', ref);
} catch (err) {
  console.log('err', err);
}

console.log('first', path.basename('/Users/sobird/checkout'));
