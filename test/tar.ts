import fs from 'node:fs';
import path from 'node:path';

import * as tar from 'tar';

const tarball = fs.createWriteStream('test.tar');

const dest = '/sobird/test';

const pack = new tar.Pack({});
const header = new tar.Header({
  path: dest,
  mode: 0o755,
  // uid: 0,
  // gid: 0,
  type: 'Directory',
  // mtime: new Date(),
});
header.encode();
const entry = new tar.ReadEntry(header);
pack.add(entry);
// pack.end();

pack.pipe(tarball);
