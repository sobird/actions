import fs from 'node:fs';

import * as tar from 'tar';

const test = fs.createReadStream('pkg/runner/__mocks__/tarStream.tar').pipe(
  tar.extract({
    // strip: 1,
    cwd: 'test', // alias for cwd:'some-dir', also ok
  }),
);

test.on('finish', () => {
  console.log('123', 123);
});

const files = fs.readdirSync('test');
console.log('files', files);
