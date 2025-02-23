import readline from 'node:readline';
import { Readable } from 'node:stream';

import LineWritable from './lineWritable';

const testLines = [
  'hello',
  ' ',
  'world!!\nextra',
  ' line\n and another\nlast',
  ' line\n',
  'no newline here...',
];

it('LineWritable unit test', () => {
  const lines: string[] = [];

  const lineWriter = new LineWritable({
    highWaterMark: 100,
  });
  lineWriter.on('line', (line: string) => {
    lines.push(line);
  });

  testLines.forEach((line) => {
    lineWriter.write(line);
  });

  expect(lines.length).toBe(4);

  assert.equal('hello world!!', lines[0]);
  assert.equal('extra line', lines[1]);
  assert.equal(' and another', lines[2]);
  assert.equal('last line', lines[3]);
});

it('readline createInterface', async () => {
  const readable = Readable.from(testLines);

  const rl = readline.createInterface({
    input: readable,
    // crlfDelay: Infinity,
  });

  const lines: string[] = [];
  rl.on('line', (line) => {
    lines.push(line);
  });

  await new Promise((resolve) => { rl.on('close', resolve); });

  // console.log('lines', lines);

  expect(lines.length).toBe(5);

  assert.equal('hello world!!', lines[0]);
  assert.equal('extra line', lines[1]);
  assert.equal(' and another', lines[2]);
  assert.equal('last line', lines[3]);
});
