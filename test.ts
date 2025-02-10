import * as core from '@actions/core';

console.log('core', core);

core.group('ddd', async () => {
  console.log('112', 112);
});

core.endGroup();
