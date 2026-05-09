import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cmd/index.ts'],
  format: ['esm'],
  shims: true,
  clean: true,
  treeshake: true,
  minify: true,
});
