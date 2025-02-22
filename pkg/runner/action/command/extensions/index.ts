import Runner from '@/pkg/runner';

import ActionCommand from '..';
import AddMatcherCommandExtension from './add-matcher';
import DebugCommandExtension from './debug';
import EchoCommandExtension from './echo';
import EndGroupCommandExtension from './endgroup';
import SetEnvCommandExtension from './env';
import GroupCommandExtension from './group';
import AddMaskCommandExtension from './mask';
import SetOutputCommandExtension from './output';
import AddPathCommandExtension from './path';
import RemoveMatcherCommandExtension from './remove-matcher';
import SaveStateCommandExtension from './state';

export interface CommandExtension {
  command: string;
  echo: boolean;
  process: (runner: Runner, actionCommand: ActionCommand) => void | Promise<void>
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
  [EchoCommandExtension.command]: EchoCommandExtension,
  [GroupCommandExtension.command]: GroupCommandExtension,
  [EndGroupCommandExtension.command]: EndGroupCommandExtension,
  [DebugCommandExtension.command]: DebugCommandExtension,
};
