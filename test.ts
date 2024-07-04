import fs from 'node:fs';

import LineWritable from './pkg/common/line-writable';

const lines: string[] = [];

const lineWriter = new LineWritable();
lineWriter.on('line', (line: string) => {
  console.log('line', line);
  lines.push(line);
});

lineWriter.on('finish', () => {
  // console.log('lines', lines);
});

const rs = fs.createReadStream('package.json', {
  highWaterMark: 100,
});

rs.pipe(lineWriter);
