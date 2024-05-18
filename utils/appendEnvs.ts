import fs from 'node:fs';
import path from 'node:path';

import dotenv, { DotenvParseOutput } from 'dotenv';
import { parse } from 'yaml';

export function appendEnvs(p: string, e: object) {
  if (!fs.existsSync(p)) {
    return false;
  }
  let envs: DotenvParseOutput = {};
  const { ext } = path.parse(p);
  if (ext === '.yml' || ext === '.yaml') {
    envs = parse(fs.readFileSync(p, 'utf8'));
  } else {
    envs = dotenv.config({ path: p }).parsed || {};
  }
  Object.assign(e, envs);
}
