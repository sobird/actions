import fs from 'node:fs';
import path from 'node:path';

import * as tar from 'tar';

const tarball = fs.createWriteStream('test.tar');

const dest = '/sobird/test';

const pack = new tar.Pack({});

// pack.pipe(tarball);

const extract = tar.t({});
pack.pipe(extract);

extract.on('entry', (entry) => {
  const content: Buffer[] = [];
  console.log('entry.path', entry.path);
  entry.on('data', (chunk: Buffer) => {
    content.push(chunk);
  });
  entry.on('end', () => {
    console.log('content', content.toString());

    // assert.ok(content, 'content should not be empty');
  });
});

extract.on('finish', () => {
  console.log('121212', 121212);
});

Array(2).fill(1).forEach((item, index) => {
  const content = Buffer.from(`ddd:${index}`);
  const header = new tar.Header({
    path: dest,
    mode: 0o755,
    size: content.byteLength,
  });
  header.encode();
  const entry = new tar.ReadEntry(header);
  entry.end(content);
  pack.add(entry);
});

pack.end();
