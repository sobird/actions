import { rm } from 'node:fs/promises';

import { external } from './config.ts';

const outdir = 'dist';

// Clean output directory
await rm(outdir, { recursive: true, force: true });

// Bundle
const result = await Bun.build({
  entrypoints: ['src/cmd/index.ts'],
  outdir,
  target: 'node',
  format: 'esm',
  minify: true,
  external,
});

if (!result.success) {
  console.error('Build failed:');
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

console.info('Build success!', result.outputs);
