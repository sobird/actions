/* eslint-disable no-underscore-dangle */
import { Transform, TransformCallback } from 'node:stream';

export default class LineTransform extends Transform {
  #lastLine: string = '';

  _transform(chunk: Buffer, encoding: BufferEncoding, callback: TransformCallback) {
    let data = chunk.toString();

    // 如果有缓存的上次未完成的行，将其与当前数据拼接
    if (this.#lastLine) {
      data = this.#lastLine + data;
      this.#lastLine = '';
    }

    const lines = data.split('\n');

    for (let i = 0; i < lines.length - 1; i++) {
      this.push(lines[i]);
    }

    // 缓存最后一行（不完整的行）
    if (lines.length > 0) {
      this.#lastLine = lines[lines.length - 1];
    }

    callback();
  }

  _flush(callback: TransformCallback) {
    // 在流结束时处理缓存的行
    if (this.#lastLine) {
      this.push(this.#lastLine); // 将最后一行推送到可读端
      this.#lastLine = '';
    }
    callback();
  }
}
