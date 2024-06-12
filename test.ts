import { spawn } from 'child_process';

const ls = spawn('bash', ['--noprofile', '--norc', '-e', '-o', 'pipefail', '/Users/sobird/.cache/act/8e75c911cd618d86/act/workflow/2.sh'], { env: process.env });

ls.stdout.on('data', (data) => {
  console.log(`stdout: ${data}`);
});

ls.stderr.on('data', (data) => {
  console.error(`stderr: ${data}`);
});

ls.on('close', (code) => {
  console.log(`child process exited with code ${code}`);
});
