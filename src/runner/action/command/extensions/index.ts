import Runner from '@/runner';

import ActionCommand from '..';
import AddMatcherCommandExtension from './add-matcher';
import DebugCommandExtension from './debug';
import EchoCommandExtension from './echo';
import EndGroupCommandExtension from './endgroup';
import SetEnvCommandExtension from './env';
import ErrorCommandExtension from './error';
import GroupCommandExtension from './group';
import AddMaskCommandExtension from './mask';
import NoticeCommandExtension from './notice';
import SetOutputCommandExtension from './output';
import AddPathCommandExtension from './path';
import RemoveMatcherCommandExtension from './remove-matcher';
import SaveStateCommandExtension from './state';
import WarningCommandExtension from './warning';

export interface CommandExtension {
  command: string;
  echo: boolean;
  process: (runner: Runner, actionCommand: ActionCommand) => void | Promise<void>;
}

export { WellKnownTags } from '@/runner';

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
  [ErrorCommandExtension.command]: ErrorCommandExtension,
  [WarningCommandExtension.command]: WarningCommandExtension,
  [NoticeCommandExtension.command]: NoticeCommandExtension,
};
