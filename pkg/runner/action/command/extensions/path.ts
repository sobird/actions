import util from 'util';

import Constants from '@/pkg/common/constants';

import type { CommandExtension } from '.';

const AddPathCommandExtension: CommandExtension = {
  command: 'add-path',
  echo: true,
  process(runner, actionCommand) {
    const { AllowUnsupportedCommands } = Constants.Variables.Actions;
    const allowUnsecureCommands = process.env[AllowUnsupportedCommands]?.toLowerCase() === 'true' || runner.context.env[AllowUnsupportedCommands]?.toLowerCase() === 'true' || false;

    if (!allowUnsecureCommands) {
      throw new Error(util.format(Constants.Runner.UnsupportedCommandMessageDisabled, this.command));
    }

    runner.addPath(actionCommand.data);
  },
};

export default AddPathCommandExtension;
