import Runner from '@/pkg/runner';

import SetEnv from './set-env';
import ActionCommand from '..';

export interface CommandExtension {
  command: string;
  echo: boolean;
  main: (runner: Runner, actionCommand: ActionCommand) => void
}

export default {
  [SetEnv.command]: SetEnv,
};
