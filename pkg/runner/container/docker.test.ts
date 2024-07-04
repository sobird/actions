import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { ContainerCreateOptions } from 'dockerode';
import dotenv from 'dotenv';
import * as tar from 'tar';

import Docker from './docker';

const Env = ['RUNNER_TOOL_CACHE=/opt/hostedtoolcache', 'RUNNER_OS=Linux', 'RUNNER_ARCH=', 'RUNNER_TEMP=/tmp', 'LANG=C.UTF-8'];

const containerCreateOptions: ContainerCreateOptions = {
  Cmd: [],
  Entrypoint: ['/bin/sleep', '3600'],
  WorkingDir: '/root',
  Image: 'node:lts-slim',
  name: 'node-lts-slim',
  Env,
  HostConfig: {
    AutoRemove: true,
    Privileged: true,
    UsernsMode: '',
  },
  platform: '',
};

const docker = new Docker(containerCreateOptions);

const tmp = path.join(os.tmpdir(), `container-docker-${randomBytes(8).toString('hex')}`);
const files = [{
  name: 'test1.txt',
  body: 'test1 content',
}, {
  name: 'test2.txt',
  body: 'test2 content',
}];
beforeAll(() => {
  fs.mkdirSync(tmp, { recursive: true });

  for (const file of files) {
    fs.writeFileSync(path.join(tmp, file.name), file.body);
  }
});

afterAll(async () => {
  fs.rmdirSync(tmp, { recursive: true });
  // const removeExecutor = docker.remove();
  // await removeExecutor.execute();
});

vi.setConfig({
  testTimeout: 60000,
});

describe('test Docker Container', () => {
  it('docker pull image test case', async () => {
    const executor = docker.pull();
    await executor.execute();
    // expect(docker.container).not.toBeUndefined();
  });

  it('docker create container test case', async () => {
    const executor = docker.create();
    await executor.execute();
    const id = docker.container?.id;
    expect(id).not.toBeUndefined();
  });

  it('docker start container test case', async () => {
    const executor = docker.start();
    await executor.execute();

    const id = docker.container?.id;
    expect(id).not.toBeUndefined();
  });

  it('docker put file to container test case', async () => {
    const executor = docker.put('put-file-test', path.join(tmp, files[0].name));
    await executor.execute();
  });

  it('docker put dir to container test case', async () => {
    const executor = docker.put('put-dir-test', tmp);
    await executor.execute();
  });

  it('docker put content to container test case', async () => {
    const executor = docker.putContent('put-content-test', ...files);
    await executor.execute();
  });

  it('put archive to container test case', async () => {
    const archive = tar.create({ cwd: tmp, portable: true }, ['.']) as unknown as NodeJS.ReadableStream;
    await docker.putArchive('put-archive-test', archive);
  });

  it('get archive from container test case', async () => {
    const tarball = await docker.getArchive('put-archive-test');

    const ws = fs.createWriteStream('tarball.tar');
    tarball?.pipe(ws);
  });

  it('container exec test case', async () => {
    const body = fs.readFileSync(path.join(__dirname, '__mocks__/print_message.sh'), 'utf8');
    const putContentExecutor = docker.putContent('', {
      name: 'print_message.sh',
      mode: 0o777,
      body,
    });
    await putContentExecutor.execute();

    const execExecutor = docker.exec(['./print_message.sh']);
    await execExecutor.execute();
  });

  it('container parseEnvFile test case', async () => {
    const envObj = await docker.parseEnvFile('print_message.sh');
    console.log('envObj', envObj);

    const image = Docker.docker.getImage('node:lts-slim');
    const imageInspectInfo = await image.inspect();

    const env = dotenv.parse(imageInspectInfo.Config.Env.join('\n'));
    console.log('env', env);
  });
});
