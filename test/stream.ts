import { PassThrough } from 'stream';

// 创建一个 PassThrough 流来合并 stdout 和 stderr
const combinedStream = new PassThrough();

// 创建两个流来分别处理 stdout 和 stderr
const stdoutStream = new PassThrough();
const stderrStream = new PassThrough();

// 模拟从Docker容器获取的混合流数据
const data = ['some stdout data', 'some stderr data'];
data.forEach((chunk) => {
  // 这里简单地交替写入stdout和stderr数据
  combinedStream.write(chunk);
  if (chunk.includes('stderr')) {
    stderrStream.write(chunk);
  } else {
    stdoutStream.write(chunk);
  }
});
combinedStream.end();

// 处理 stdout 数据
stdoutStream.on('data', (chunk) => {
  console.log('stdout:', chunk.toString());
});

// 处理 stderr 数据
stderrStream.on('data', (chunk) => {
  console.error('stderr:', chunk.toString());
});
