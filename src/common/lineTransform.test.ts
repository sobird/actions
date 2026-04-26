import { Readable, Writable } from 'node:stream';

import { describe, it, expect } from 'vitest';

import LineTransform from './lineTransform';

describe('LineTransform', () => {
  const testLines = [
    'hello',
    ' ',
    'world!!\nextra',
    ' line\n and another\nlast',
    ' line\n',
    'no newline here...',
  ];

  it('line transform unit test', () => {
    const lines: string[] = [];

    const lineWriter = new LineTransform({
      highWaterMark: 1,
    });

    lineWriter.on('data', (line: string) => {
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

  it('should split data into lines and add newline to the last line', async () => {
    const inputData = 'line1\nline2\nline3'; // 输入数据
    const expectedOutput = 'line1line2line3'; // 期望输出

    const readable = Readable.from([inputData]);

    const lineTransform = new LineTransform();

    // 创建可写流，用于收集输出数据
    let outputData = '';
    const writable = new Writable({
      write(chunk, encoding, callback) {
        outputData += chunk.toString();
        callback();
      },
    });

    // 构建管道：读取 -> 转换 -> 写入
    readable.pipe(lineTransform).pipe(writable);

    // 等待流结束
    await new Promise((resolve) => { writable.on('finish', resolve); });

    // 断言输出数据是否符合预期
    expect(outputData).toBe(expectedOutput);
  });

  it('should handle multiple chunks correctly', async () => {
    const inputChunks = ['line1\nlin', 'e2\nline3']; // 输入数据（分块）
    const expectedOutput = 'line1line2line3'; // 期望输出

    // 创建可读流
    const readable = Readable.from(inputChunks);

    // 创建 LineTransform 实例
    const lineTransform = new LineTransform();

    // 创建可写流，用于收集输出数据
    let outputData = '';
    const writable = new Writable({
      write(chunk, encoding, callback) {
        outputData += chunk.toString();
        callback();
      },
    });

    // 构建管道：读取 -> 转换 -> 写入
    readable.pipe(lineTransform).pipe(writable);

    // 等待流结束
    await new Promise((resolve) => { writable.on('finish', resolve); });

    // 断言输出数据是否符合预期
    expect(outputData).toBe(expectedOutput);
  });

  it('should handle empty input', async () => {
    const inputData = ''; // 空输入
    const expectedOutput = ''; // 期望输出

    // 创建可读流
    const readable = Readable.from([inputData]);

    // 创建 LineTransform 实例
    const lineTransform = new LineTransform();

    // 创建可写流，用于收集输出数据
    let outputData = '';
    const writable = new Writable({
      write(chunk, encoding, callback) {
        outputData += chunk.toString();
        callback();
      },
    });

    // 构建管道：读取 -> 转换 -> 写入
    readable.pipe(lineTransform).pipe(writable);

    // 等待流结束
    await new Promise((resolve) => { writable.on('finish', resolve); });

    // 断言输出数据是否符合预期
    expect(outputData).toBe(expectedOutput);
  });
});
