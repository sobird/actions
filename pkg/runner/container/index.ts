import readline from 'node:readline';

import dotenv from 'dotenv';
import * as tar from 'tar';

import Executor from '@/pkg/common/executor';

export interface FileEntry {
  name: string;
  mode?: number;
  body: string;
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

  abstract os: string;

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

  async getContent(filename: string): Promise<string> {
    const archive = await this.getArchive(filename);
    const stream = tar.list({});
    archive.pipe(stream);

    return new Promise((resolve, reject) => {
      stream.on('entry', (entry) => {
        let content = '';
        entry.on('data', (chunk: Buffer) => {
          content += chunk;
        });
        entry.on('error', (err: Error) => {
          reject(err);
        });
        entry.on('end', () => {
          resolve(content);
        });
      });
    });
  }

  async readline(filename: string, callback?: (line: string) => void) {
    const archive = await this.getArchive(filename);
    const stream = tar.list({});
    archive.pipe(stream);

    return new Promise((resolve, reject) => {
      stream.on('entry', (entry) => {
        let content = '';
        entry.on('data', (chunk: Buffer) => {
          content += chunk;
        });
        const rl = readline.createInterface({ input: entry, crlfDelay: Infinity });
        rl.on('line', (line) => {
          if (line) {
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
    });
  }

  async parseEnvFile(filename: string) {
    const archive = await this.getArchive(filename);

    const stream = tar.list({});
    archive.pipe(stream);

    return new Promise((resolve, reject) => {
      stream.on('entry', (entry) => {
        let content = '';
        entry.on('data', (chunk: Buffer) => {
          content += chunk;
        });
        entry.on('error', (err: Error) => {
          reject(err);
        });
        entry.on('end', () => {
          const config = dotenv.parse(content);
          resolve(config ?? {});
        });
      });
    });
  }

  get pathVariableName() {
    const { os } = this;
    // if (platform === 'plan9') {
    //   return 'path';
    // }
    if (os === 'Windows') {
      return 'Path';
    }
    return 'PATH';
  }

  get defaultPathVariable() {
    return process.env[this.pathVariableName];
  }

  get isCaseSensitive() {
    return this.os !== 'Windows';
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
}
