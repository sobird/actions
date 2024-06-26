import { exec } from 'child_process';

function hashFiles() {
  const env = {
    ...process.env,
    patterns: './package.json',
  };

  const command = `node ${__dirname}/index.js`;

  return new Promise((resolve) => {
    exec(command, { env }, (error, stdout, stderr) => {
      if (error) throw error;
      const output = `${stdout}\n${stderr}`;
      const guard = '__OUTPUT__';
      const outstart = output.indexOf(guard);
      if (outstart !== -1) {
        const outstartAdjusted = outstart + guard.length;
        const outend = output.indexOf(guard, outstartAdjusted);
        if (outend !== -1) {
          const hash = output.slice(outstartAdjusted, outend);
          console.log('hash', hash);
          resolve(hash);
        }
      }
    });
  });
}

it('hashFiles test case', async () => {
  const hash = await hashFiles();
  console.log('hash', hash);
});
