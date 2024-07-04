import LineWritable from './line-writable';

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
