import fs from 'node:fs';
import path from 'node:path';

import dotenv, { DotenvParseOutput } from 'dotenv';
import { parse } from 'yaml';

import { readJsonSync } from './readJsonSync';

export function readConfSync(confPath: string) {
  if (!fs.existsSync(confPath)) {
    return {};
  }
  let envs: DotenvParseOutput = {};
  const { ext } = path.parse(confPath);
  if (ext === '.yml' || ext === '.yaml') {
    envs = parse(fs.readFileSync(confPath, 'utf8'));
  } else if (ext === '.json') {
    envs = readJsonSync(confPath);
  } else {
    envs = dotenv.config({ path: confPath }).parsed || {};
  }
  return envs;
}
