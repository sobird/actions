import Docker, { Container } from 'dockerode';
import dotenv from 'dotenv';
import * as tar from 'tar';

export async function parseEnvFile(container: Container, path: string) {
  const stream = await container.getArchive({ path });

  const tarStream = tar.t({});
  stream?.pipe(tarStream);

  tarStream.on('entry', (entry) => {
    let content = '';
    entry.on('data', (chunk: Buffer) => {
      content += chunk;
    });
    entry.on('end', () => {
      console.log(`Content of ${entry.path}:`, content);
      // 这里可以处理 content，例如保存到文件或进行其他操作
      const config = dotenv.parse(content);
      console.log('config', config);
    });
  });
}

// test case
const docker = new Docker();
const container = docker.getContainer('a2ce6a03aeafe3d81a4ab2de13f28be8d4b187956c2bca8506665eddfb646ea2');

parseEnvFile(container, '/root/env');
