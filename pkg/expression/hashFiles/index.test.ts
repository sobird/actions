import { exec } from 'child_process';

const env = {
  ...process.env,
  patterns: './package.json',
};

const command = `node ${__dirname}/index.js`;

it('hashFiles test case', () => {
  const output = exec(command, { env }, (error, stdout, stderr) => {
    if (error) throw error;
    console.log('hash:', stderr);
  });

  console.log('output', output.stderr);
});
