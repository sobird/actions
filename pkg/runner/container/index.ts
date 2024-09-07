import fs from 'node:fs';
import os from 'node:os';
import readline from 'node:readline';
import path from 'path';

import * as tar from 'tar';

import Constants from '@/pkg/common/constants';
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

  private async getEntry(filename: string): Promise<tar.ReadEntry> {
    const archive = await this.getArchive(filename);

    const extract = tar.t({ portable: true, noResume: true });
    archive.pipe(extract);

    return new Promise((resolve, reject) => {
      extract.on('entry', (entry: tar.ReadEntry) => {
        // archive.unpipe(extract);
        entry.pause();
        resolve(entry);
      });
      archive.on('error', (err) => {
        reject(err);
      });
    });
  }

  async getContent(filename: string): Promise<FileEntry> {
    const archive = await this.getArchive(filename);
    const extract = tar.t({ portable: true });
    archive.pipe(extract);

    return new Promise((resolve) => {
      extract.on('entry', (entry: tar.ReadEntry) => {
        if (entry.size === 0) {
          resolve({
            name: entry.path,
            mode: entry.mode,
            size: entry.size,
            body: '',
          });
        }

        let body = '';
        entry.on('data', (chunk: Buffer) => {
          body += chunk;
        });
        entry.on('end', () => {
          if (entry.type === 'File') {
            resolve({
              name: entry.path,
              mode: entry.mode,
              size: entry.size,
              body,
            });
            archive.unpipe(extract);
          }
        });
      });
    });
  }

  async readline(filename: string, callback?: (line: string) => void): Promise<string> {
    const file = await this.getEntry(filename);

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

    // rl.pause();

    rl.on('line', (line) => {
      console.log('line', line);
      if (line.trim()) {
        callback?.(line);
      }

      // file.resume();
    });

    return new Promise((resolve, reject) => {
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

    const { body } = await this.getContent(filename);
    const lines = body.split('\n');

    lines.forEach((line) => {
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

      if (key) {
        env[key] = value;
      }

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
    return paths.join(this.platform === 'Windows' ? ';' : ':');
  }

  splitPath(pathString: string) {
    return pathString.split(this.platform === 'Windows' ? ';' : ':');
  }

  lookPath(file: string, env: Record<string, string>) {
    if (file.includes('/')) {
      if (Container.isExecutable(file)) {
        return file;
      }
      return '';
    }
    const envPath = Container.GetEnv(env, this.pathVariableName);
    const dirs = this.splitPath(envPath).map((dir) => {
      return dir.trim() === '' ? '.' : dir.trim();
    });

    for (let i = 0; i < dirs.length; i++) {
      const dir = dirs[i];
      const fullPath = path.join(dir, file);
      if (Container.isExecutable(fullPath)) {
        return fullPath;
      }
    }

    return '';
  }

  get defaultPathVariable() {
    return process.env[this.pathVariableName];
  }

  async applyPath(prependPath: string[], env: Record<string, string>) {
    if (prependPath.length > 0) {
      let { pathVariableName } = this;

      if (this.platform === 'Windows') {
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
      env[pathVariableName] = this.joinPath(...prependPath, env[pathVariableName]);
    }
    return env;
  }

  get isCaseSensitive() {
    return this.platform !== 'Windows';
  }

  directory(directory: keyof typeof Constants.Directory) {
    return this.resolve(Constants.Directory[directory]);
  }

  static GetEnv(env:Record<string, string>, name: string) {
    if (process.platform === 'win32') {
      for (const k of Object.keys(env)) {
        if (k.toLowerCase() === name.toLowerCase()) {
          return env[k];
        }
      }
      return '';
    }
    return env[name] || '';
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
