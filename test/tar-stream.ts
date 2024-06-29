import fs from 'node:fs';

import tar from 'tar-stream';

const pack = tar.pack();
const path = 'YourTarBall.tar';
const yourTarball = fs.createWriteStream(path);

pack.entry({ name: 'my-test.txt' }, 'Hello World!');

const entry = pack.entry({ name: 'package.json', size: 11 }, (err) => {
  // the stream was added
  // no more entries
  pack.finalize();
});

entry.write('hello');
entry.write(' ');
entry.write('world');
entry.end();

// pack.pipe(process.stdout);

pack.pipe(yourTarball);

yourTarball.on('close', () => {
  console.log(`${path} has been written`);
  fs.stat(path, (err, stats) => {
    if (err) throw err;
    console.log(stats);
    console.log('Got file info successfully!');
  });
});

const extract = tar.extract();
