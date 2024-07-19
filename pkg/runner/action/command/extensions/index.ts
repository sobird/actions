import Runner from '@/pkg/runner';

import SetEnvCommandExtension from './env';
import SetOutputCommandExtension from './output';
import SaveStateCommandExtension from './state';
import ActionCommand from '..';

export interface CommandExtension {
  command: string;
  echo: boolean;
  process: (runner: Runner, actionCommand: ActionCommand) => void
}

// todo add more
export default {
  [SetEnvCommandExtension.command]: SetEnvCommandExtension,
  [SetOutputCommandExtension.command]: SetOutputCommandExtension,
  [SaveStateCommandExtension.command]: SaveStateCommandExtension,
};
