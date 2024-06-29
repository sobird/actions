import fs from 'node:fs';

import * as tar from 'tar';

const path = 'myTarBall.tar';
const yourTarball = fs.createWriteStream(path);

const pack = new tar.Pack({ cwd: 'test' });

// const readd = new tar.ReadEntry(new tar.Header(Buffer.from('ddddddddd'), 512));

// pack.write(Buffer.from('sssss'));

// pack.add('package.json');
// pack.write(readd);

const readEntry = new tar.ReadEntry(
  new tar.Header({
    path: 'x',
    type: 'File',
    size: 1,
  }),
);
pack.end(readEntry);
const out = [];
pack.on('data', (c) => { return out.push(c); });
pack.on('end', (_) => {
  const data = Buffer.concat(out);
});
const buf = Buffer.alloc(512);
buf.write('x');
readEntry.end(buf);

pack.pipe(yourTarball);
