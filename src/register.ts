/* eslint-disable @typescript-eslint/naming-convention */
import { dirname, resolve } from 'node:path';
import { register } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  register(resolve(__dirname, 'ts-esm-loader-with-tsconfig-paths.js'), pathToFileURL('./'));
} catch (error) {
  // todo
}
