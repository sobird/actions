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
  abstract put(destination: string, source: string, useGitIgnore: boolean): Executor;
  abstract putContent(destination: string, ...files: FileEntry[]): Executor;
  abstract putArchive(destination: string, readStream: NodeJS.ReadableStream): Promise<void>;
  abstract getArchive(destination: string): Promise<NodeJS.ReadableStream>;
  abstract exec(command: string[], options: ExecCreateOptions): Executor;
  get pathVariableName() {
    const { platform } = process;
    // if (platform === 'plan9') {
    //   return 'path';
    // }
    if (platform === 'win32') {
      return 'Path';
    }
    return 'PATH';
  }

  get defaultPathVariable() {
    return process.env[this.pathVariableName];
  }

  get isCaseInsensitive() {
    return process.platform === 'win32';
  }
}
