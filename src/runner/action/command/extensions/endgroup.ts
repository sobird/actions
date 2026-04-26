import type { CommandExtension } from '.';

const EndGroupCommandExtension: CommandExtension = {
  command: 'endgroup',
  echo: false,
  process(runner) {
    runner.output(`##[${this.command}]`);
  },
};

export default EndGroupCommandExtension;
