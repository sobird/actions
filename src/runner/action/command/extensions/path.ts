import util from 'node:util';

import { Constants } from '@/common/constants';

import type { CommandExtension } from '.';

const AddPathCommandExtension: CommandExtension = {
  command: 'add-path',
  echo: true,
  process(runner, actionCommand) {
    const { AllowUnsupportedCommands } = Constants.Variables.Actions;
    const allowUnsecureCommands =
      process.env[AllowUnsupportedCommands]?.toLowerCase() === 'true' ||
      runner.context.env[AllowUnsupportedCommands]?.toLowerCase() === 'true' ||
      false;

    if (!allowUnsecureCommands) {
      throw new Error(util.format(Constants.Runner.UnsupportedCommandMessageDisabled, this.command));
    }

    const path = actionCommand.data;
    if (!path) {
      throw new Error('Required path is missing in ##[add-path] command.');
    }

    runner.addPath(path);
  },
};

export default AddPathCommandExtension;
