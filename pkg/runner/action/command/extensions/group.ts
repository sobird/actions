import type { CommandExtension } from '.';

const GroupCommandExtension: CommandExtension = {
  command: 'group',
  echo: false,
  process(runner, command) {
    runner.output(`##[${this.command}]${command.data}`);
  },
};

export default GroupCommandExtension;
