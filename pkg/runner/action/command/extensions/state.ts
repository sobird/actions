import util from 'util';

import Constants from '@/pkg/common/constants';

import type { CommandExtension } from '.';

const Properties = {
  Name: 'name',
};

const SaveStateCommandExtension: CommandExtension = {
  command: 'save-state',
  echo: true,
  process(runner, actionCommand) {
    if (runner.context.vars['DistributedTask.DeprecateStepOutputCommands']) {
      const message = util.format(Constants.Runner.UnsupportedCommandMessage, this.command);
      console.error(message);
      // todo AddIssue
    }

    const key = actionCommand.properties[Properties.Name];

    if (!key) {
      throw new Error("Required field 'name' is missing in ##[set-output] command.");
    }

    runner.saveState(key, actionCommand.data);
  },
};

export default SaveStateCommandExtension;
