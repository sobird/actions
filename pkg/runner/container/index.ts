/* eslint-disable @typescript-eslint/naming-convention */
import { type SpawnSyncReturns } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import path from 'path';

import * as tar from 'tar';

import Constants from '@/pkg/common/constants';
import Executor from '@/pkg/common/executor';
import { trimPrefix } from '@/utils/trimPrefix';

export interface FileEntry {
  name: string;
  mode?: number;
  body: string;
  size?: number;
}

export interface ContainerExecOptions {
  cwd?: string;
  env?: object;
  user?: string;
  privileged?: boolean;
}

export interface ContainerOptions {
  name?: string;
  workdir: string;
  env: string[],
  stdout: string;
  stderr: string;
}

const hashFilesDir = path.join(Constants.Directory.Bin, 'hashFiles');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default abstract class Container {
  rootdir: string = '';

  abstract OS: string;

  abstract Arch: string;

  debug = '';

  abstract Environment: string;

  putHashFileExecutor = this.put(hashFilesDir, path.resolve(__dirname, 'hashFiles/index.js'));

  // constructor(public options: ContainerOptions) {}

  constructor(public options: unknown, public workspace: string = '/home/runner') {}

  get ToolDir() {
    return this.resolve(Constants.Directory.Tool);
  }

  get TempDir() {
    return this.resolve(Constants.Directory.Temp);
  }

  /** 容器操作相关 */
  abstract start(): Executor;
  abstract remove(): Executor;
  abstract pullImage(force?: boolean): Executor;

  /** 上传文件/目录 */
  abstract put(destination: string, source: string, useGitIgnore?: boolean): Executor;
  abstract putContent(destination: string, ...files: FileEntry[]): Executor;
  abstract putArchive(destination: string, archive: NodeJS.ReadableStream): Executor;
  abstract getArchive(destination: string): Promise<NodeJS.ReadableStream>;
  abstract exec(command: string[], options: ContainerExecOptions): Executor;
  abstract spawnSync(command: string, args: string[], options: ContainerExecOptions): SpawnSyncReturns<string>;
  // hashFiles功能应由所在容器提供
  // abstract hashFiles(...patterns: string[]): string;
  abstract resolve(...paths: string[]): string;
  abstract imageEnv(): Promise<Record<string, string>>;
  abstract context(): Promise<{
    id: string;
    network: string;
    ports: Record<string, string>
  }>;

  public hashFiles(...patterns: string[]) {
    const followSymlink = patterns[0] === '--follow-symbolic-links';
    if (followSymlink) {
      patterns.shift();
    }

    const env = {
      // ...process.env,
      patterns: patterns.join('\n'),
    };

    const { workdir } = this.options as { workdir: string };
    const hashFilesScript = this.resolve(hashFilesDir, 'index.js');

    let hashResult = '';
    const { stderr } = this.spawnSync('node', [hashFilesScript], { env, cwd: workdir });
    const matches = stderr.match(/__OUTPUT__([a-fA-F0-9]*)__OUTPUT__/g);
    if (matches && matches.length > 0) {
      hashResult = matches[0].slice(10, -10);
    }

    return hashResult;
  }

  async getContent(filename: string): Promise<FileEntry | undefined> {
    // todo should catch error?
    try {
      const archive = await this.getArchive(filename);
      const extract = tar.t({ portable: true });
      archive.pipe(extract as NodeJS.WritableStream);

      return await new Promise((resolve) => {
        extract.on('entry', (entry: tar.ReadEntry) => {
          if (entry.type === 'SymbolicLink') {
            resolve(this.getContent(Container.SymlinkJoin(filename, entry.header.linkpath || '', '.')));
          }
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
              archive.unpipe(extract as NodeJS.WritableStream);
            }
          });
        });
      });
    } catch (error) {
      //
    }
  }

  async readJSON(filename: string) {
    const content = await this.getContent(filename);

    if (!content) {
      return {};
    }

    try {
      return JSON.parse(content.body);
    } catch (err) {
      return {};
    }
  }

  async readline(filename: string, callback?: (line: string) => void) {
    const archive = await this.getArchive(filename);

    const extract = tar.t({ portable: true, noResume: true });
    archive.pipe(extract as NodeJS.WritableStream);

    return new Promise<void>((resolve, reject) => {
      extract.on('entry', (entry: tar.ReadEntry) => {
        if (entry.size === 0) {
          resolve();
        }

        const rl = readline.createInterface({
          input: entry as unknown as NodeJS.ReadableStream,
          crlfDelay: Infinity,
        });

        rl.on('line', (line) => {
          if (line.trim()) {
            callback?.(line);
          }
        });

        rl.on('close', () => {
          resolve();
        });

        rl.on('error', (err) => {
          reject(err);
        });
      });
      archive.on('error', (err) => {
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

    const fileEntry = await this.getContent(filename);
    const lines = fileEntry?.body.split('\n') || [];

    lines.forEach((line) => {
      const equalsIndex = line.indexOf('=');
      const heredocIndex = line.indexOf('<<');

      if (delimiter) {
        if (delimiter === line) {
          env[key] = delimiterValues.join(os.EOL);
          key = '';
          value = '';
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
    if (this.OS === 'plan9') {
      return 'path';
    }
    if (this.OS === 'Windows') {
      return 'Path';
    }
    return 'PATH';
  }

  joinPath(...paths: string[]) {
    return paths.join(this.OS === 'Windows' ? ';' : ':');
  }

  splitPath(pathString: string) {
    return pathString.split(this.OS === 'Windows' ? ';' : ':');
  }

  lookPath(file: string, env: Record<string, string | undefined>) {
    if (file.includes(path.sep)) {
      if (Container.isExecutable(file)) {
        return file;
      }
      return '';
    }
    const envPath = Container.GetEnv(env, this.pathVariableName) || '';
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

  async applyPath(prependPath: string[], env: Record<string, string> = {}) {
    if (prependPath.length > 0) {
      let { pathVariableName } = this;

      if (this.OS === 'Windows') {
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
    return this.OS !== 'Windows';
  }

  directory(directory: keyof typeof Constants.Directory) {
    return this.resolve(Constants.Directory[directory]);
  }

  get Env() {
    const env: Record<string, unknown> = {};
    env.RUNNER_ARCH = this.Arch;
    env.RUNNER_OS = this.OS;
    env.RUNNER_TOOL_CACHE = this.resolve(Constants.Directory.Tool);
    env.RUNNER_TEMP = this.resolve(Constants.Directory.Temp);
    env.RUNNER_DEBUG = 1;
    env.RUNNER_ENVIRONMENT = '';
    env.RUNNER_NAME = '';

    return env;
  }

  // container internal path
  Resolve(...paths: string[]) {
    return trimPrefix(this.resolve(...paths), this.rootdir);
  }

  static Normalize(pth: string) {
    const normalizedPath = path.normalize(pth).replace(/\\/g, '/');
    if (normalizedPath.startsWith('/mnt/')) {
      return normalizedPath;
    }

    const windowsPathRegex = /^([a-zA-Z]):(\/.*)$/;
    const windowsPathComponents = windowsPathRegex.exec(normalizedPath);

    if (windowsPathComponents === null) {
      return normalizedPath;
    }

    // win32
    const driveLetter = windowsPathComponents[1].toLowerCase();
    const translatedPath = windowsPathComponents[2].replace(/\\/g, '/');
    const result = `/mnt/${driveLetter}${translatedPath}`;

    return path.posix.normalize(result);
  }

  static GetEnv(env:Record<string, string | undefined>, name: string) {
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

  static OS(platform: string) {
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

  static SymlinkJoin(filename: string, sym: string, parent: string) {
    const dir = path.dirname(filename);
    const dest = path.join(dir, sym);
    const prefix = path.normalize(parent) + path.sep;

    if (dest.startsWith(prefix) || prefix === './') {
      return dest;
    }

    throw new Error(`symlink tries to access file '${dest}' outside of '${parent}`);
  }
}
