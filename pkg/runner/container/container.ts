import { Mode } from 'node:fs';

import Executor from '@/pkg/common/executor';

export interface FileEntry {
  name: string;
  mode?: Mode;
  body: string;
}
export default abstract class AbstractContainer {
  abstract put(destination: string, source: string, useGitIgnore: boolean): Executor;
}
