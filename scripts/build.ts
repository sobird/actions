import { rm } from 'node:fs/promises';

import pkg from '../package.json';
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
  external: [...external],
});

if (!result.success) {
  console.error('Build failed:');
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

console.info('Build success!', result.outputs);

// package.json
// oxlint-disable-next-line no-unused-vars
const { workspaces, scripts, devDependencies, files, 'lint-staged': _, trustedDependencies, ...cleanPkg } = pkg;

await Bun.write(
  `${outdir}/package.json`,
  JSON.stringify(
    {
      ...cleanPkg,
      name: '@sobird/actions',
      main: 'index.js',
      bin: { actions: 'index.js' },
      dependencies: Object.fromEntries(external.map((dep) => [dep, pkg.dependencies[dep]])),
    },
    null,
    2,
  ),
);

await Promise.all([
  Bun.write(`${outdir}/README.md`, Bun.file('README.md')),
  Bun.write(`${outdir}/LICENSE`, Bun.file('LICENSE')),
]);
