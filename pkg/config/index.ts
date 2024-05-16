/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable max-classes-per-file */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv, { DotenvParseOutput } from 'dotenv';
import yaml from 'yaml';

import { Registration } from './registration';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class Log {
  constructor(public level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' = 'debug') {}
}

class Runner {
  constructor(
    public file: string = '.runner',
    public capacity: number = 1,
    public envs: DotenvParseOutput = {},
    public envFile: string = '',
    public timeout: number = 3 * 3600 * 1000,
    public insecure: boolean = false,
    public fetchTimeout: number = 5 * 1000,
    public fetchInterval: number = 2 * 1000,
    public labels: string[] = [],
  ) {
    this.capacity = capacity > 0 ? capacity : 1;
    this.timeout = timeout > 0 ? timeout : 3 * 3600 * 1000;
    this.fetchTimeout = fetchTimeout > 0 ? fetchTimeout : 5000;
    this.fetchInterval = fetchInterval > 0 ? fetchInterval : 2000;
  }

  // 从环境变量文件加载环境变量
  loadEnvs() {
    if (this.envFile && fs.existsSync(this.envFile)) {
      this.envs = dotenv.config({ path: this.envFile }).parsed || {};
    }
  }
}

class Cache {
  constructor(
    public enabled: boolean = true,
    public dir: string = path.join(os.homedir(), '.cache', 'actcache'),
    public host: string = '',
    public port: number = 0,
    public external_server: string = '',
  ) {}
}

class Container {
  constructor(
    public network: string = '',
    public privileged: boolean = false,
    public options: string = '',
    public workdir_parent: string = '',
    public valid_volumes: string[] = [],
    public docker_host: string = '',
    public force_pull: boolean = true,
    public force_rebuild: boolean = false,
  ) {}
}

class Host {
  constructor(public workdir_parent: string = path.join(os.homedir(), '.cache', 'act')) {}
}

class Config {
  static Registration = Registration;

  constructor(
    public log: Log = new Log(),
    public runner: Runner = new Runner(),
    public cache: Cache = new Cache(),
    public container: Container = new Container(),
    public host: Host = new Host(),
    public registration?: Registration,
  ) {}

  // 加载默认配置
  static loadDefault(file?: string) {
    let config = new Config();
    if (file && fs.existsSync(file)) {
      config = yaml.parse(fs.readFileSync(file, 'utf8'));
    }

    // 兼容旧环境变量
    config.runner.loadEnvs();

    config.registration = Registration.load(config.runner.file);

    // 设置默认值

    return config;
  }

  static example() {
    return fs.readFileSync(path.resolve(__dirname, 'config.example.yaml'), 'utf-8');
  }
}

export default Config;
