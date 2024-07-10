import { spawnSync } from 'node:child_process';
import path from 'node:path';

import { ContainerExecOptions } from './pkg/runner/container';

// export function spawnSync(command: string, args: string[], options: ContainerExecOptions = {}) {
//   const dockerArgs = ['exec'];
//   if (options.env) {
//     Object.entries(options.env || {}).forEach(([key, value]) => {
//       dockerArgs.push('-e', `${key}=${value}`);
//     });
//   }

//   if (options.workdir) {
//     dockerArgs.push('-w', options.workdir);
//   }

//   if (options.privileged) {
//     dockerArgs.push('--privileged');
//   }

//   if (options.user) {
//     dockerArgs.push('-u', options.user);
//   }

//   dockerArgs.push('1b586e4ad3249ebddbc01081f2b861ab28ee4da5a074291c6818145489ef254a');
//   dockerArgs.push(command);
//   dockerArgs.push(...args);

//   return spawnSync('docker', dockerArgs);
// }

// const { stdout, stderr } = spawnSync('node', ['hashFiles/index.cjs'], { env: { sobird: 'sobird', patterns: 'print_message.sh' }, cwd: '/root' });
// console.log('result', stdout.toString());
// console.log('result', stderr.toString());

const patterns = ['package.json'];

const env = {
  ...process.env,
  patterns: patterns.join('\n'),
};
const { stdout, stderr } = spawnSync('node', ['/var/folders/0g/085cjcx1231cqqknq0k8pbzh0000gn/T/hosted-test/36905e86e00216b9/bin/hashFiles/index.cjs'], { env, encoding: 'utf8' });
console.log('stdout', stdout);
console.log('stderr', stderr);
