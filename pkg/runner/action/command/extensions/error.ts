import type { CommandExtension } from '.';

const ErrorCommandExtension: CommandExtension = {
  command: 'error',
  echo: false,
  process(runner, actionCommand) {
    // runner.error(actionCommand.data);
  },
};

export default ErrorCommandExtension;
