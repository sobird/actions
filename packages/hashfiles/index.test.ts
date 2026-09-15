import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const script = join(__dirname, 'dist/hashFiles.js');

function hashFiles(...patterns: string[]) {
  const followSymlink = patterns[0] === '--follow-symbolic-links';
  if (followSymlink) {
    patterns.shift();
  }

  // dist/ is gitignored, so a fresh checkout has no script to run until it is built.
  if (!existsSync(script)) {
    throw new Error(`${script} not found; build it with \`bun packages/hashfiles/build.ts\``);
  }

  // A clean env, not the inherited one: hashFiles only ever reads these two keys,
  // and a stray followSymbolicLinks or patterns in the parent would leak into the run.
  const env: Record<string, string> = { patterns: patterns.join('\n') };
  if (followSymlink) {
    env.followSymbolicLinks = 'true';
  }

  // Rooted at this package: globbing `**/package.json` from the repo root descends
  // into node_modules and takes longer than the test timeout.
  // process.execPath, not 'node': the clean env carries no PATH to resolve it with.
  const result = spawnSync(process.execPath, [script], {
    cwd: __dirname,
    env: env as NodeJS.ProcessEnv,
    stdio: 'pipe',
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`hashFiles exited with ${result.status}: ${result.stderr.toString()}`);
  }

  // Same marker the container parses out of the child's stderr.
  const matches = result.stderr.toString().match(/__OUTPUT__([a-fA-F0-9]*)__OUTPUT__/g);
  return matches ? matches[0].slice(10, -10) : '';
}

it('Test hashFiles', () => {
  const hash = hashFiles('**/package.json');
  expect(hash.length).toBe(64);
});
