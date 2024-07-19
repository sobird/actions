import Runner from '@/pkg/runner';
import { Github } from '@/pkg/runner/context/github';

import SetEnvFileCommand from './env';
import SetOutputFileCommand from './output';
import AddPathFileCommand from './path';
import SaveStateFileCommand from './state';
import CreateStepSummaryCommand from './step_summary';

export interface FileCommandExtension {
  // Avoid overwriting the original variables of GitHub context
  contextKey: keyof Pick<Github, 'path' | 'env' | 'step_summary' | 'state' | 'output'>;
  filePrefix: string;
  process: (runner: Runner, file: string,) => void | Promise<void>;
}

export default [
  AddPathFileCommand,
  SetEnvFileCommand,
  CreateStepSummaryCommand,
  SaveStateFileCommand,
  SetOutputFileCommand,
];
