import { spawn } from 'node:child_process';
import tty from 'node:tty';

import Docker from 'dockerode';

import { createLineWriteStream } from './pkg/common/lineWritable';
import DockerDemuxer from './pkg/docker/demuxer';

const res = spawn('tsx', ['./test/test.ts'], {});
// console.log('res', res);

const str = createLineWriteStream((line) => {
  console.log('line', line);
});

str.on('pipe', (data) => {
  console.log('data', data);
});

str.on('command', (data) => {
  console.log('command', data);
});

res.stdout.pipe(str);
// res.stderr.pipe(process.stderr);
// const docker = new Docker();

// // 容器配置
// const containerOptions = {
//   Image: 'alpine', // 使用 alpine 镜像
//   Cmd: ['tail', '-f', '/dev/null'],
//   // Cmd: ['sh', '-c', 'echo "This is stdout" && echo "This is stderr" >&2'], // 容器执行的命令
//   AttachStdout: true, // 捕获 stdout
//   AttachStderr: true, // 捕获 stderr
//   Tty: false, // 禁用 TTY（以便正确捕获输出）
// };

// const container = await docker.createContainer(containerOptions);

// // 启动容器
// await container.start();

// console.log('Container started');

// // 执行命令的配置
// const execOptions = {
//   Cmd: ['sh', '-c', 'echo "This is stdout" && echo "This is stderr" >&2'], // 要执行的命令
//   AttachStdout: true, // 捕获 stdout
//   AttachStderr: true, // 捕获 stderr
//   Tty: true, // 禁用 TTY（以便正确捕获输出）
// };

// // 创建 exec 实例
// const exec = await container.exec(execOptions);

// // 启动 exec 实例
// const stream = await exec.start({ });

// const parse = new DockerDemuxer();

// stream.pipe(parse);

// // 捕获输出
// let output = '';
// stream.on('data', (chunk) => {
//   output += chunk.toString();
// });

// stream.on('end', () => {
//   console.log('Command output:');
//   console.log(output);
// });

// // 处理错误
// stream.on('error', (err) => {
//   console.error('Error from exec stream:', err);
// });
// const isatty = tty.isatty(process.stdout.fd);
// console.log('isatty', isatty);
// 捕获容器的输出
// container.attach({ stream: true, stdout: true, stderr: true }, (err, stream) => {
//   if (err) {
//     console.error('Failed to attach to container:', err);
//     return;
//   }

//   // 将容器的输出流连接到当前进程的 stdout 和 stderr
//   stream.pipe(process.stdout); // stdout
//   stream.pipe(process.stderr); // stderr

//   // 等待容器退出
//   container.wait((err, data) => {
//     if (err) {
//       console.error('Failed to wait for container:', err);
//       return;
//     }

//     console.log('Container exited with status code:', data.StatusCode);

//     // 删除容器
//     container.remove((err) => {
//       if (err) {
//         console.error('Failed to remove container:', err);
//         return;
//       }

//       console.log('Container removed');
//     });
//   });
// });
