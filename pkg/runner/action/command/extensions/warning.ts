import type { CommandExtension } from '.';

const WarningCommandExtension: CommandExtension = {
  command: 'warning',
  echo: false,
  process(runner, actionCommand) {
    // runner.warning(actionCommand.data);
  },
};

export default WarningCommandExtension;
