import type { CommandExtension } from '.';

const DebugCommandExtension: CommandExtension = {
  command: 'debug',
  echo: false,
  process(runner, actionCommand) {
    // runner.debug(actionCommand.data);
  },
};

export default DebugCommandExtension;
