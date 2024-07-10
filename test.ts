import cp, { SpawnSyncOptions } from 'node:child_process';

import { ContainerExecOptions } from './pkg/runner/container';

export function spawnSync(command: string, args: string[], options: ContainerExecOptions = {}) {
  const dockerArgs = ['exec'];
  if (options.env) {
    Object.entries(options.env || {}).forEach(([key, value]) => {
      dockerArgs.push('-e', `${key}=${value}`);
    });
  }

  if (options.workdir) {
    dockerArgs.push('-w', options.workdir);
  }

  if (options.privileged) {
    dockerArgs.push('--privileged');
  }

  if (options.user) {
    dockerArgs.push('-u', options.user);
  }

  dockerArgs.push('1b586e4ad3249ebddbc01081f2b861ab28ee4da5a074291c6818145489ef254a');
  dockerArgs.push(command);
  dockerArgs.push(...args);

  return cp.spawnSync('docker', dockerArgs);
}

const { stdout, stderr } = spawnSync('node', ['hashFiles/index.cjs'], { env: { sobird: 'sobird', patterns: 'print_message.sh' }, cwd: '/root' });
console.log('result', stdout.toString());
console.log('result', stderr.toString());
