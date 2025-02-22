/* eslint-disable no-underscore-dangle */
import { Transform, TransformCallback } from 'stream';

export default class DockerDemuxer extends Transform {
  buffer = Buffer.alloc(0);

  constructor(
    public stdout: NodeJS.WritableStream = process.stdout,
    public stderr: NodeJS.WritableStream = process.stderr,
  ) {
    super();
  }

  _transform(chunk: Buffer, encoding: string, callback: TransformCallback) {
    // 将新数据追加到缓冲区
    this.buffer = Buffer.concat([this.buffer, chunk]);

    // 解析流数据
    while (this.buffer.length >= 8) {
      const header = this.buffer.subarray(0, 8);
      const type = header.readUInt8(0); // 流类型 (0: stdin, 1: stdout, 2: stderr)
      const length = header.readUInt32BE(4); // 数据长度

      // 检查是否有足够的数据
      if (this.buffer.length < 8 + length) {
        break;
      }

      // 提取数据
      const payload = this.buffer.subarray(8, 8 + length);
      this.buffer = this.buffer.subarray(8 + length);

      // 根据流类型处理数据
      if (type === 1) {
        // this.push(payload);
        this.stdout.write(payload);
      } else if (type === 2) {
        // this.push(payload);
        this.stderr.write(payload);
      }
    }

    callback();
  }

  _flush(callback: TransformCallback) {
    // 处理剩余的数据（如果有）
    if (this.buffer.length > 0) {
      console.warn('Remaining data in buffer:', this.buffer.toString());
    }
    callback();
  }
}
