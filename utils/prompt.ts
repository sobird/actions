// 直接用 npm i prompts
import readline from 'node:readline';

export function prompt(query: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: query,
    });

    rl.on('line', (input) => {
      resolve(input);
      rl.close();
    });

    rl.on('close', () => {
      resolve('');
    });

    rl.on('error', (err) => {
      reject(err);
    });

    rl.prompt();
  });
}
