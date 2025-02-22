/* eslint-disable max-classes-per-file */
/* eslint-disable no-underscore-dangle */
import { spawn } from 'child_process';
import {
  Transform, TransformOptions, PassThrough, TransformCallback,
} from 'stream';

const child = spawn('sh', ['-c', 'echo "This is stdout" && echo "This is stderr" >&2'], {});

// 创建一个自定义的 Transform 流
export class MyTransform extends Transform {
  // 实现 _transform 方法
  _transform(chunk: Buffer, encoding: string, callback: TransformCallback) {
    // 对数据进行处理，这里我们将数据转换为大写
    const transformedChunk = chunk.toString().toUpperCase();

    // 将处理后的数据推送到流的下一阶段
    // this.push(transformedChunk);

    const parts = chunk.toString().split(' ');
    // 推送每个部分
    parts.forEach((part) => {
      this.push(part.toUpperCase());
    });

    // 调用 callback 表示处理完成
    callback(null, transformedChunk);
  }
}

// 使用自定义的 Transform 流
// const myTransform = new MyTransform();

// 从标准输入读取数据，并通过 Transform 流进行处理
// 将数据通过 Transform 流进行处理
// 将处理后的数据输出到标准输出
// process.stdin.pipe(myTransform).pipe(process.stdout);

// 自定义 Transform 流，用于区分 stdout 和 stderr
class StdioTransform extends Transform {
  stdout: PassThrough;

  stderr: PassThrough;

  constructor(opts?: TransformOptions) {
    super(opts);
    this.stdout = new PassThrough(); // 用于 stdout 的流
    this.stderr = new PassThrough(); // 用于 stderr 的流
  }

  _transform(chunk: Buffer, encoding: string, callback: TransformCallback) {
    // 假设 chunk 包含一个前缀标识是 stdout 还是 stderr
    // 例如：'stdout:data' 或 'stderr:error message'
    const data = chunk.toString();
    if (data.startsWith('stdout:')) {
      // 推送到 stdout 流
      this.stdout.push(data.slice('stdout:'.length));
    } else if (data.startsWith('stderr:')) {
      // 推送到 stderr 流
      this.stderr.push(data.slice('stderr:'.length));
    } else {
      // 未知类型，推送到 stderr
      this.stderr.push(`Unknown data type: ${data}`);
    }
    callback();
  }

  // 在流结束时调用
  _flush(callback: TransformCallback) {
    this.stdout.push(null); // 结束 stdout 流
    this.stderr.push(null); // 结束 stderr 流
    callback();
  }
}

const stdioTransform = new StdioTransform();

// const stream = process.stdin.pipe(stdioTransform);
// stream.stdout.pipe(process.stdout);
// stream.stderr.pipe(process.stderr);
