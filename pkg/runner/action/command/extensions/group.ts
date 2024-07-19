import type { CommandExtension } from '.';

const GroupCommandExtension: CommandExtension = {
  command: 'group',
  echo: false,
  process(runner, actionCommand) {
    runner.output(`##[${this.command}]${actionCommand.data}`);
  },
};

export default GroupCommandExtension;
