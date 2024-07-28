import fs from 'node:fs';
import os from 'node:os';
import readline from 'node:readline';
import path from 'path';

import * as tar from 'tar';

import Executor from '@/pkg/common/executor';

export interface FileEntry {
  name: string;
  mode?: number;
  body: string;
  size?: number;
}

export interface ContainerExecOptions {
  env?: NodeJS.ProcessEnv;
  privileged?: boolean;
  workdir?: string;
  user?: string;
}

export interface ContainerOptions {
  name?: string;
  workdir: string;
  env: string[],
  stdout: string;
  stderr: string;
}

export default abstract class Container {
  name = '';

  abstract platform: string;

  abstract arch: string;

  temp = '';

  tool_cache = '';

  debug = '';

  environment = 'github-hosted';

  // constructor(public options: ContainerOptions) {}

  /** 上传文件/目录 */
  abstract put(destination: string, source: string, useGitIgnore: boolean): Executor;
  abstract putContent(destination: string, ...files: FileEntry[]): Executor;
  abstract putArchive(destination: string, readStream: NodeJS.ReadableStream): Promise<void>;
  abstract getArchive(destination: string): Promise<NodeJS.ReadableStream>;
  abstract start(): Executor;
  abstract exec(command: string[], options: ContainerExecOptions): Executor;
  // abstract spawnSync(command: string, args: string[], options: ContainerExecOptions): SpawnSyncReturns<string> | undefined;
  // hashFiles功能应由所在容器提供
  abstract hashFiles(...patterns: string[]): string;
  abstract resolve(...paths: string[]): string;
  abstract imageEnv(): Promise<Record<string, string>>;

  async getFile(filename: string): Promise<tar.ReadEntry> {
    const archive = await this.getArchive(filename);
    const extract = tar.list({});
    archive.pipe(extract);

    return new Promise((resolve, reject) => {
      extract.on('entry', (entry) => {
        resolve(entry);
      });
      archive.on('error', (err) => {
        reject(err);
      });
    });
  }

  async getContent(filename: string): Promise<FileEntry> {
    const file = await this.getFile(filename);
    if (file.size === 0) {
      return {
        name: file.path,
        mode: file.mode,
        size: file.size,
        body: '',
      };
    }

    let body = '';
    file.on('data', (chunk: Buffer) => {
      body += chunk;
    });

    return new Promise((resolve, reject) => {
      file.on('error', (err) => {
        reject(err);
      });
      file.on('end', () => {
        resolve({
          name: file.path,
          mode: file.mode,
          size: file.size,
          body,
        });
      });
    });
  }

  async readline(filename: string, callback?: (line: string) => void): Promise<string> {
    const file = await this.getFile(filename);
    let content = '';

    if (file.size === 0) {
      return content;
    }

    file.on('data', (chunk: Buffer) => {
      content += chunk;
    });

    const rl = readline.createInterface({
      input: file as unknown as NodeJS.ReadableStream,
      crlfDelay: Infinity,
    });

    return new Promise((resolve, reject) => {
      rl.on('line', (line) => {
        if (line.trim()) {
          callback?.(line);
        }
      });
      rl.on('close', () => {
        resolve(content);
      });

      rl.on('error', (err) => {
        reject(err);
      });
    });
  }

  async getFileEnv(filename: string): Promise<Record<string, string>> {
    let key = '';
    let value = '';
    let delimiter = '';
    let delimiterValues: string[] = [];

    const env: Record<string, string> = {};

    await this.readline(filename, (line) => {
      const equalsIndex = line.indexOf('=');
      const heredocIndex = line.indexOf('<<');

      if (delimiter) {
        if (delimiter === line) {
          env[key] = delimiterValues.join(os.EOL);
          delimiter = '';
          delimiterValues = [];
        } else {
          delimiterValues.push(line);
        }
        return;
      }

      // Normal style NAME=VALUE
      if (equalsIndex >= 0 && (heredocIndex < 0 || equalsIndex < heredocIndex)) {
        const split = line.split('=');
        [key] = split;
        const [, ...rest] = split;
        value = rest.join('=');
      } else if (heredocIndex >= 0 && (equalsIndex < 0 || heredocIndex < equalsIndex)) {
        // Heredoc style NAME<<EOF
        const split = line.split('<<', 2);

        if (!split[0] || !split[1]) {
          throw new Error(`Invalid format '${line}'. Name must not be empty and delimiter must not be empty`);
        }

        [key, delimiter] = split;

        return;
      } else {
        // throw new Error("Invalid format '{line}'");
      }

      env[key] = value;
      key = '';
      value = '';
    });

    if (delimiter) {
      throw new Error(`Invalid value. Matching delimiter not found '${delimiter}'`);
    }

    return env;
  }

  get pathVariableName() {
    const { platform } = this;
    if (platform === 'plan9') {
      return 'path';
    }
    if (platform === 'Windows') {
      return 'Path';
    }
    return 'PATH';
  }

  joinPath(...paths: string[]) {
    return paths.join(this.platform === 'windows' ? ';' : ':');
  }

  splitPath(pathString: string) {
    return pathString.split(this.platform === 'windows' ? ';' : ':');
  }

  lookPath(file: string, env: Record<string, string>) {
    if (file.includes('/')) {
      if (Container.isExecutable(file)) {
        return file;
      }
      return '';
    }
    const envPath = this.getEnv(env, this.pathVariableName);
    this.splitPath(envPath).map((dir) => { return dir.trim(); }).forEach((item) => {
      let dir = item;
      if (dir === '') {
        // Unix shell semantics: path element "" means "."
        dir = '.';
      }
      const fullPath = path.join(dir, file);
      if (Container.isExecutable(fullPath)) {
        return fullPath;
      }
    });

    return '';
  }

  get defaultPathVariable() {
    return process.env[this.pathVariableName];
  }

  getEnv(env:Record<string, string>, name: string) {
    if (this.platform === 'windows') {
      for (const k of Object.keys(env)) {
        if (k.toLowerCase() === name.toLowerCase()) {
          return env[k];
        }
      }
      return '';
    }
    return env[name];
  }

  async applyPath(prependPath: string[], env: Record<string, string>) {
    if (prependPath.length > 0) {
      let { pathVariableName } = this;

      if (this.platform === 'windows') {
        for (const k of Object.keys(env)) {
          if (k.toLowerCase() === pathVariableName.toLowerCase()) {
            pathVariableName = k as 'path' | 'Path' | 'PATH';
            break;
          }
        }
      }

      if (!env[pathVariableName]) {
        let cpath = '';
        const imageEnv = await this.imageEnv();
        for (const k of Object.keys(imageEnv)) {
          if (k === pathVariableName) {
            cpath = imageEnv[k];
            break;
          }
        }

        cpath = cpath || this.defaultPathVariable || '';

        prependPath.push(cpath);
      }

      // eslint-disable-next-line no-param-reassign
      env[pathVariableName] = this.joinPath(...prependPath);
    }
  }

  get isCaseSensitive() {
    return this.platform !== 'Windows';
  }

  static Os(platform: string) {
    const map: Record<string, string> = {
      aix: 'Aix',
      darwin: 'macOS',
      freebsd: 'Freebsd',
      linux: 'Linux',
      openbsd: 'Openbsd',
      sunos: 'Sunos',
      win32: 'Windows',
    };
    return map[platform];
  }

  static Arch(arch: string) {
    const map: Record<string, string> = {
      arm: 'ARM',
      arm64: 'ARM64',
      ia32: 'X86',
      loong64: 'LOONG64',
      mips: 'MIPS',
      mipsel: 'MIPSEL',
      ppc: 'PPC',
      ppc64: 'PPC64',
      riscv64: 'RISCV64',
      s390: 'S390',
      s390x: 'S390X',
      x64: 'X64',

      x86_64: 'X64',
      amd64: 'X64',
      386: 'X86',
      aarch64: 'ARM64',
    };
    return map[arch];
  }

  // Check if a file is an executable file
  static isExecutable(file: string) {
    try {
      const stats = fs.statSync(file);
      return !stats.isDirectory() && (stats.mode & 0o111) !== 0;
    } catch (err) {
      return false;
    }
  }
}
