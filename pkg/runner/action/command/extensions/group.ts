import type { CommandExtension } from '.';
// todo 是否需要？
const GroupCommandExtension: CommandExtension = {
  command: 'group',
  echo: false,
  process(runner, command) {
    console.log(`##[${this.command}]${command.data}`);
    runner.output(`##[${this.command}]${command.data}`);
  },
};

export default GroupCommandExtension;
