/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable max-classes-per-file */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import rc from 'rc';
import yaml from 'yaml';

import { ACTIONS_HOME } from '@/pkg/common/constants';

import Cache from './cache';
import Container from './container';
import { Registration } from './registration';
import Runner from './runner';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Log {
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
}

class Config {
  static Registration = Registration;

  public log: Log;

  public runner: Runner;

  public cache: Cache;

  public container: Container;

  /**
   * The parent directory of a job's working directory.
   * If it's empty, $ACTIONS_HOME/actions/ will be used.
   */
  public actionCacheDir: string;

  public file: string = path.join(ACTIONS_HOME, 'config');

  constructor(config: Config) {
    this.log = config.log ?? {};
    this.runner = new Runner(config.runner ?? {});
    this.cache = new Cache(config.cache ?? {});
    this.container = new Container(config.container ?? {});
    this.actionCacheDir = config.actionCacheDir ?? path.join(ACTIONS_HOME, 'actions');
  }

  save() {
    fs.writeFileSync(this.file, JSON.stringify(this, null, 2), 'utf8');
  }

  static Load(file?: string, appname = 'actions') {
    const config = rc(appname, Config.Default, { config: file });
    return new Config(config);
  }

  static get Default() {
    return yaml.parse(fs.readFileSync(path.resolve(__dirname, 'default.yaml'), 'utf-8'));
  }
}

export default Config;
