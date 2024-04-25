import Docker from 'dockerode';

const docker = new Docker({ socketPath: '/var/run/docker.sock' });
const result = await docker.ping();

console.log('docker', result.toString());
