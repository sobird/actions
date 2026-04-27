import { Transform, TransformOptions, PassThrough, TransformCallback } from 'node:stream';

/**
 * Docker Stream Demuxer
 *
 * 把这个“大杂烩”流拆回成两个独立的流：stdout 和 stderr。(1 代表 stdout，2 代表 stderr)
 *
 * 当你通过 Docker 远程 API 或 docker attach 获取交互式流数据时，Docker 并不会直接给你纯净的文本，
 * 而是将 stdout（标准输出）和 stderr（标准错误）混合在同一个 TCP 数据流中。
 * 为了区分它们，Docker 采用了一种特殊的 **8 字节头部协议**。
 */
export default class DockerDemuxer extends Transform {
  buffer = Buffer.alloc(0);

  stdout: PassThrough;

  stderr: PassThrough;

  constructor(opts?: TransformOptions) {
    super(opts);
    this.stdout = new PassThrough();
    this.stderr = new PassThrough();
  }

  _transform(chunk: Buffer, encoding: string, callback: TransformCallback) {
    // 将新数据追加到缓冲区
    this.buffer = Buffer.concat([this.buffer, chunk]);

    // 解析流数据
    while (this.buffer.length >= 8) {
      const head = this.buffer.subarray(0, 8);
      const type = head.readUInt8(0); // 流类型 (0: stdin, 1: stdout, 2: stderr)
      const length = head.readUInt32BE(4); // 数据长度

      // 检查是否有足够的数据
      if (this.buffer.length < 8 + length) {
        break;
      }

      // 提取数据
      const payload = this.buffer.subarray(8, 8 + length);
      this.buffer = this.buffer.subarray(8 + length);

      // 根据流类型处理数据
      if (type === 1) {
        this.stdout.push(payload);
      } else if (type === 2) {
        this.stderr.push(payload);
      }
    }

    callback();
  }

  _flush(callback: TransformCallback) {
    // 处理剩余的数据（如果有）
    if (this.buffer.length > 0) {
      console.warn('Remaining data in buffer:', this.buffer.toString());
    }

    this.stdout.end();
    this.stderr.end();
    callback();
  }
}
