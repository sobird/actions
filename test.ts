import { spawn } from 'node:child_process';
import path from 'node:path';

const cp = spawn('./print_message.sh', [], {
  cwd: '/var/folders/0g/085cjcx1231cqqknq0k8pbzh0000gn/T/hosted-test/1d453285733f292f',
});

// cp.stdout.pipe(process.stdout);
// cp.stderr.pipe(process.stdout);

cp.stdout.on('data', (data) => {
  console.log(`stdout: ${data}`);
});

cp.stderr.on('data', (data) => {
  console.log(`stderr: ${data}`);
});
