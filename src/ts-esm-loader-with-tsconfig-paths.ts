// https://github.com/TypeStrong/ts-node/discussions/1450#discussioncomment-1806115
// https://github.com/TypeStrong/ts-node/pull/1585#issuecomment-1474931539

// "serve": "cross-env TS_NODE_PROJECT=\"tsconfig.build.json\" node --experimental-specifier-resolution=node --loader ./loader.js src/index.ts",
// TS_NODE_PROJECT=\"tsconfig.build.json\" node --experimental-specifier-resolution=node --loader ./loader.js src/index.ts"

import { resolve as resolveTs } from 'ts-node/esm';
import * as tsConfigPaths from 'tsconfig-paths';
import { pathToFileURL } from 'url';

const { absoluteBaseUrl, paths } = tsConfigPaths.loadConfig();
const matchPath = tsConfigPaths.createMatchPath(absoluteBaseUrl, paths);

export function resolve(specifier, ctx, defaultResolve) {
  const match = matchPath(specifier);
  return match ? resolveTs(pathToFileURL(`${match}`).href, ctx, defaultResolve) : resolveTs(specifier, ctx, defaultResolve);
}

export { load, getFormat, transformSource } from 'ts-node/esm';
