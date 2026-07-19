import fs from 'node:fs';

import { cosmiconfigSync } from 'cosmiconfig';
import { merge } from 'lodash-es';

import { readJsonSync } from '@/utils';

import { ConfigSchema, Registration } from './schema';

export function getConfig(appname = 'actions', config = {}) {
  const explorer = cosmiconfigSync(appname);
  const result = explorer.search();
  const fileConfig = result?.config || {};

  const parseResult = ConfigSchema.safeParse(merge(fileConfig, config));

  if (!parseResult.success) {
    console.error('❌ Configuration error:', parseResult.error);
    process.exit(1);
  }

  return parseResult.data;
}

export function saveRegistration(registration: Registration) {
  const config = getConfig();
  const configPath = config.runner.file ?? '.runner';

  fs.writeFileSync(
    configPath,
    JSON.stringify(registration, (key, value) => (typeof value === 'bigint' ? value.toString() : value), 2),
    'utf8',
  );
}

export function getRegistration(): Registration {
  const config = getConfig();
  const configPath = config.runner.file ?? '.runner';

  return readJsonSync(configPath);
}

export * from './schema';
