import { createTestFile } from '@/utils/test';

import docker, { Docker } from '.';

vi.setConfig({
  testTimeout: 20000,
});

describe('test docker pull executor', () => {
  it('docker pull test case', async () => {
    await docker.pullImage('alpine');
  });

  it('docker pull force test case', async () => {
    await docker.pullImage('alpine', {
      force: true,
    });
  });
});

describe('Test Get Socket And Host', () => {
  it('with socket', async () => {
    const host = 'unix:///my/docker/host.sock';
    const socket = '/path/to/my.socket';
    process.env.DOCKER_HOST = host;

    const ret = Docker.SocketAndHost(socket);
    expect(ret).toEqual({ socket, host });
  });

  it('no socket', async () => {
    const host = 'unix:///my/docker/host.sock';
    process.env.DOCKER_HOST = host;

    const ret = Docker.SocketAndHost();
    expect(ret).toEqual({ socket: host, host });
  });

  it('only socket', async () => {
    const socket = '/path/to/my.socket';
    process.env.DOCKER_HOST = '';

    const host = Docker.Host();

    const ret = Docker.SocketAndHost(socket);
    expect(ret).toEqual({ socket, host });
  });

  it('Dont Mount', () => {
    const host = 'unix:///my/docker/host.sock';
    const socket = '-';
    process.env.DOCKER_HOST = host;

    const ret = Docker.SocketAndHost(socket);
    expect(ret).toEqual({ socket, host });
  });

  it('No Host No Socket', () => {
    process.env.DOCKER_HOST = '';
    const host = Docker.Host();

    const ret = Docker.SocketAndHost();
    expect(ret).toEqual({ socket: host, host });
  });

  const mySocketFile = createTestFile('act-test.sock');
  it('No Host No Socket DefaultLocation', () => {
    const unixSocket = `unix://${mySocketFile}`;
    process.env.DOCKER_HOST = '';
    Docker.SocketLocations = [mySocketFile];

    const ret = Docker.SocketAndHost();
    expect(ret).toEqual({ socket: unixSocket, host: unixSocket });
  });

  it('No Host Invalid Socket', () => {
    const mySocket = '/my/socket/path.sock';
    process.env.DOCKER_HOST = '';
    Docker.SocketLocations = ['/unusual', '/socket', '/location'];
    const host = Docker.Host();

    const ret = Docker.SocketAndHost(mySocket);
    expect(host).toBe('');
    expect(ret).toEqual({ socket: '', host: '' });
  });

  it('Only Socket Valid But Unusual Location', () => {
    const socketPath = 'unix:///path/to/my.socket';
    process.env.DOCKER_HOST = '';
    Docker.SocketLocations = ['/unusual', '/location'];
    const host = Docker.Host();

    const ret = Docker.SocketAndHost(socketPath);
    expect(host).toBe('');
    expect(ret).toEqual({ socket: socketPath, host: socketPath });
  });
});
