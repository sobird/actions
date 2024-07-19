import Runner from '@/pkg/runner';

import AddMatcherCommandExtension from './add-matcher';
import SetEnvCommandExtension from './env';
import AddMaskCommandExtension from './mask';
import SetOutputCommandExtension from './output';
import AddPathCommandExtension from './path';
import RemoveMatcherCommandExtension from './remove-matcher';
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
  [AddMaskCommandExtension.command]: AddMaskCommandExtension,
  [AddPathCommandExtension.command]: AddPathCommandExtension,
  [AddMatcherCommandExtension.command]: AddMatcherCommandExtension,
  [RemoveMatcherCommandExtension.command]: RemoveMatcherCommandExtension,
};
