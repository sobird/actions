import util from 'util';

import Constants from '@/pkg/common/constants';

import type { CommandExtension } from '.';

const ENV_KEY = 'name';

const SetEnvCommandExtension: CommandExtension = {
  command: 'set-env',
  echo: true,
  process(runner, actionCommand) {
    const { AllowUnsupportedCommands } = Constants.Variables.Actions;
    const allowUnsecureCommands = process.env[AllowUnsupportedCommands]?.toLowerCase() === 'true' || runner.context.env[AllowUnsupportedCommands]?.toLowerCase() === 'true' || false;

    if (!allowUnsecureCommands) {
      throw new Error(util.format(Constants.Runner.UnsupportedCommandMessageDisabled, this.command));
    }

    const envKey = actionCommand.properties[ENV_KEY];

    if (!envKey) {
      throw new Error("Required field 'name' is missing in ##[set-env] command.");
    }

    runner.setEnv(envKey, actionCommand.data);
  },
};

export default SetEnvCommandExtension;
