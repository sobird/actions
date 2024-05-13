/**
 *
 * envs
 * DOCKER_HOST,SSH_AUTH_SOCK,DOCKER_PATH_PREFIX,DOCKER_CERT_PATH,DOCKER_CLIENT_TIMEOUT
 *
 * sobird<i@sobird.me> at 2024/04/25 19:09:50 created.
 */

import fs from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';

import Dockerode, { Container } from 'dockerode';

import Executor from '@/pkg/common/executor';

const socketPath = process.env.DOCKER_HOST || [
  join(os.homedir(), '.docker', 'run', 'docker.sock'),
  '/var/run/docker.sock',
  '/run/podman/podman.sock',
  '//./pipe/docker_engine',
  join(os.homedir(), '.colima', 'docker.sock'),
  process.env.XDG_RUNTIME_DIR ? join(process.env.XDG_RUNTIME_DIR, 'docker.sock') : '',
  process.env.XDG_RUNTIME_DIR ? join(process.env.XDG_RUNTIME_DIR, 'podman', 'podman.sock') : '',
].find((path) => {
  return fs.existsSync(path);
});

console.log('socketPath', socketPath);

interface DockerPullExecutorInput {
  image: string;
  force?: boolean;
  platform?: string;
  username?: string;
  password?: string;
}

class Docker extends Dockerode {
  static get instance() {
    return 1212;
  }

  pullExecutor(input: DockerPullExecutorInput) {
    return new Executor(async () => {
      const {
        image, force, platform, ...authconfig
      } = input;

      const img = this.getImage(image);
      try {
        await img.inspect();
        if (force) {
          img.remove({ force: true });
        } else {
          return;
        }
      } catch (err) {
        //
      }

      await new Promise((resolve, reject) => {
        console.log("pulling image '%s' (%s)", image, platform);
        this.pull(image, {
          platform,
          authconfig,
        }, (err, stream) => {
          if (err) {
            reject(err);
            return;
          }

          this.modem.followProgress(stream!, (err2, output) => {
            if (err2) {
              reject(err2);
            } else {
              resolve(output);
            }
          });
        });
      });
    });
  }
}

export default Docker;

const docker = new Docker();

docker.pullExecutor({
  image: 'alpine',
  force: true,
}).execute();

// const images = await docker.listImages();
// console.log('images', images.length);

// const container = await docker.createContainer({
//   Image: 'gitea/runner-images:ubuntu-latest',
//   name: 'docker_c_test_name',
//   AttachStdin: false,
//   AttachStdout: true,
//   AttachStderr: true,
//   Tty: true,
//   // Cmd: ['/bin/bash', '-c', 'tail -f /var/log/dmesg'],
//   OpenStdin: false,
//   StdinOnce: false,
// });
// const data = await container.start();
// console.log('data', data.toString());

// const container = docker.getContainer('296e7501a56ca880d738157f2ab8abeb1c0fa8f637bd31145c03c3192e9ba87b');

// 获取日志
// container.logs({
//   follow: true, // 实时获取日志
//   stdout: true, // 获取标准输出日志
//   stderr: true, // 获取标准错误日志
// }, (error, stream) => {
//   if (error) {
//     return console.error(error);
//   }

//   // 流式传输日志
//   let containerLogs = '';
//   stream.setEncoding('utf8');
//   stream.on('data', (chunk) => {
//     containerLogs += chunk;
//   });
//   stream.on('end', () => {
//     console.log('日志结束:\n', containerLogs);
//   });
//   stream.on('error', (error) => {
//     console.error('流式日志出错:', error);
//   });
// });

// container.exec({
//   Cmd: ['sh', '-c', 'ls /'], // 替换为你要执行的命令
//   AttachStdout: true,
//   AttachStderr: true,
//   Tty: true,
// }, (err, exec) => {
//   if (err) {
//     console.error('Error executing command:', err);
//     return;
//   }

//   // exec?.resize({ h: 720, w: 120 }); // 根据需要设置终端大小

//   // 启动 exec 实体
//   const stream1 = exec?.start({}, (err, stream) => {
//     if (err) {
//       console.error('Error starting exec stream:', err);
//       return;
//     }

//     // 监听输出
//     stream?.on('data', (data) => {
//       process.stdout.write(data);
//     });
//     stream?.on('error', (err) => {
//       console.error('Error on exec stream:', err);
//     });
//     stream?.on('end', () => {
//       console.log('Exec stream ended.');
//     });
//   });
// });
// console.log('res', res);
