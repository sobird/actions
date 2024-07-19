import type { CommandExtension } from '.';

const NoticeCommandExtension: CommandExtension = {
  command: 'notice',
  echo: false,
  process(runner, actionCommand) {
    // runner.notice(actionCommand.data);
  },
};

export default NoticeCommandExtension;
