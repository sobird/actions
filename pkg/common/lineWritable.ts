/* eslint-disable no-underscore-dangle */

import { Writable } from 'node:stream';

export default class LineWritable extends Writable {
  _lastLine: string = '';

  _write(chunk: Buffer, encoding: BufferEncoding, callback: (error?: Error | null) => void) {
    let data = chunk.toString();
    if (this._lastLine) {
      data = this._lastLine + data;
      this._lastLine = '';
    }

    const lines = data.split('\n');
    for (let i = 0; i < lines.length - 1; i++) {
      this.emit('line', lines[i]);
    }

    if (lines.length > 0) {
      this._lastLine += lines[lines.length - 1];
    }

    callback();
  }

  _final(callback: (error?: Error | null) => void) {
    if (this._lastLine) {
      this.emit('line', this._lastLine);
      this._lastLine = '';
    }
    callback();
  }
}

export function createLineWriteStream(...fns: ((line: string) => boolean | void)[]) {
  return new LineWritable({
    highWaterMark: 1,
    objectMode: true,
  }).on('line', (line) => {
    for (const fn of fns) {
      if (fn(line) === false) {
        break;
      }
    }
  });
}
