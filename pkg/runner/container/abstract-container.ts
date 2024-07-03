/* eslint-disable class-methods-use-this */

import Executor from '@/pkg/common/executor';

export interface FileEntry {
  name: string;
  mode?: number;
  body: string;
}

export interface ExecCreateOptions {
  env?: NodeJS.ProcessEnv;
  user?: string;
  workdir?: string;
}

export default abstract class AbstractContainer {
  name = '';

  os = '';

  arch = '';

  temp = '';

  tool_cache = '';

  debug = '';

  environment = '';

  abstract put(destination: string, source: string, useGitIgnore: boolean): Executor;
  abstract putContent(destination: string, ...files: FileEntry[]): Executor;
  abstract putArchive(destination: string, readStream: NodeJS.ReadableStream): Promise<void>;
  abstract getArchive(destination: string): Promise<NodeJS.ReadableStream>;
  abstract exec(command: string[], options: ExecCreateOptions): Executor;

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

  get isCaseInsensitive() {
    return this.os === 'Windows';
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
