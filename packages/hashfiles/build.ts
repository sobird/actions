import { rm } from 'node:fs/promises';

const outdir = 'dist';

// Clean output directory
await rm(outdir, { recursive: true, force: true });

const result = await Bun.build({
  entrypoints: ['src/hashFiles.ts'],
  outdir: 'dist',
  target: 'node',
  format: 'esm',
  minify: true,
});

if (!result.success) {
  console.error('Build failed:');
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

console.info('Build success!', result.outputs);

const bundledCode = await result.outputs[0].text();
const hashfiles = `export const hashfiles = ${JSON.stringify(bundledCode)};`;
await Bun.write('./src/index.ts', hashfiles);
