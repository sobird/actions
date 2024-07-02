import Executor from '@/pkg/common/executor';

export interface FileEntry {
  name: string;
  mode?: number;
  body: string;
}

export interface ExecCreateInputs {
  env?: string[];
  user?: string;
  workdir?: string;
}

export default abstract class AbstractContainer {
  abstract put(destination: string, source: string, useGitIgnore: boolean): Executor;
  abstract putContent(destination: string, ...files: FileEntry[]): Executor;
  abstract exec(command: string[], inputs: ExecCreateInputs): Executor;
}
