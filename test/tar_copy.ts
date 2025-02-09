import fs from 'node:fs';

import * as tar from 'tar';

async function run() {
  const sourceDir = 'test'; // 源目录
  const destDir = 'destination'; // 目标目录

  // 确保目标目录存在
  fs.mkdirSync(destDir, { recursive: true });

  // 创建打包流
  const pack = tar.create(
    {
      // gzip: true, // 启用 gzip 压缩（可选）
      cwd: sourceDir, // 源目录
    },
    ['.'], // 打包当前目录下的所有文件和子目录
  );

  // 创建解包流
  const unpack = tar.x(
    {
      // gzip: true, // 启用 gzip 解压（可选）
      cwd: destDir, // 解包到的目标目录
    },
  );

  // 将打包流通过管道连接到解包流
  pack.pipe(unpack);

  // 监听事件
  // pack.on('end', () => {
  //   console.log('打包完成');
  // });

  await new Promise<void>((resolve, reject) => {
    unpack.on('finish', () => {
      console.log('解包完成');
      resolve();
    });

    pack.on('error', (err) => {
      console.error('打包过程中出错:', err);
      reject();
    });

    unpack.on('error', (err) => {
      console.error('解包过程中出错:', err);
    });
  });
}

await run();
console.log('1122', 1122);
