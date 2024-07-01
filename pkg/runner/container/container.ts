import Executor from '@/pkg/common/executor';

export interface FileEntry {
  name: string;
  mode?: number;
  body: string;
}
export default abstract class AbstractContainer {
  abstract put(destination: string, source: string, useGitIgnore: boolean): Executor;
}
