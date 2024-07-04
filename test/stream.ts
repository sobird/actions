import fs from 'node:fs';
import { Writable } from 'node:stream';

export class LineWriter extends Writable {
  constructor(options) {
    super(options);
    this.buffer = '';
    this.handlers = options.handlers || [];
  }

  _write(chunk, encoding, callback) {
    const data = chunk.toString();
    let line;
    // 分割数据为多行
    const lines = data.split('\n');

    // 处理所有行，除了最后一行（可能不完整）
    for (let i = 0; i < lines.length - 1; i++) {
      line = lines[i];
      this.handleLine(line);

      this.emit('line', line);
    }

    // 将最后一行（可能不完整）存储在缓冲区中
    console.log('lines', lines[lines.length - 1]);
    if (lines.length > 0) {
      this.buffer += lines[lines.length - 1];
    }

    callback(); // 表示写入操作已完成
  }

  handleLine(line) {
    for (const handler of this.handlers) {
      if (handler(line) === false) {
        break;
      }
    }
  }

  // 添加行处理器
  addHandler(handler) {
    this.handlers.push(handler);
  }

  // 当需要清空缓冲区时，可以重写 _final 方法
  _final(callback) {
    console.log('_final', 1212, this.buffer);
    if (this.buffer) {
      this.handleLine(this.buffer);
      this.buffer = '';
    }
    callback();
  }
}

const lw = new LineWriter({
  highWaterMark: 0,
  objectMode: true, // 以对象模式处理数据
  handlers: [
    (line) => {
      console.log('处理行:', line);
      // 返回 false 以停止进一步处理
      return true;
    },
  ],
});

process.stdin.pipe(lw);

lw.addListener('line', (ddd) => {
  console.log('ddd', ddd);
});

console.log('lw.listeners', lw);

lw.on('line', (line) => {
  console.log('line', line);
});

console.log('lw.eventNames', lw.eventNames);

const rs = fs.createReadStream('package.json');
// const ws = fs.createWriteStream();
rs.pipe(lw);
