import { Github } from '@/pkg/runner/context/github';

import AddPathFileCommand from './path';

export interface FileCommandExtension {
  // Avoid overwriting the original variables of GitHub context
  contextKey: keyof Pick<Github, 'path' | 'env' | 'step_summary' | 'state' | 'output'>;
  filePrefix: string;
  process: () => void | Promise<void>;
}

export default [
  AddPathFileCommand,
];
