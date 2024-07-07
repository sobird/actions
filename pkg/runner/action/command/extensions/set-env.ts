import util from 'util';

import Constants from '@/pkg/common/constants';
import { assignIgnoreCase } from '@/utils';

import type { CommandExtension } from '.';

const ENV_KEY = 'name';
const SetEnvBlockList = ['NODE_OPTIONS'];

const commandExtension: CommandExtension = {
  command: 'set-env',
  omitEcho: false,
  main(runner, actionCommand) {
    let allowUnsecureCommands = false;
    if (process.env.ACTIONS_ALLOW_UNSECURE_COMMANDS === 'true') {
      allowUnsecureCommands = true;
    }

    if (runner.context.env.ACTIONS_ALLOW_UNSECURE_COMMANDS === 'true') {
      allowUnsecureCommands = true;
    }

    if (!allowUnsecureCommands) {
      throw new Error(util.format(Constants.Runner.UnsupportedCommandMessageDisabled, this.command));
    }

    const envKey = actionCommand.properties[ENV_KEY];

    if (!envKey) {
      throw new Error("Required field 'name' is missing in ##[set-env] command.");
    }

    if (SetEnvBlockList.includes(envKey.toUpperCase())) {
      console.log(`Can't update ${envKey} environment variable using ::set-env:: command.`);
      return;
    }

    const assign = runner.container?.isCaseSensitive ? Object.assign : assignIgnoreCase;

    assign(runner.context.env, { [envKey]: actionCommand.data });
    assign(runner.globalEnv, { [envKey]: actionCommand.data });
  },
};

export default commandExtension;
