import type { CommandExtension } from '.';

const AddMaskCommandExtension: CommandExtension = {
  command: 'add-mask',
  echo: false,
  process(runner, actionCommand) {
    runner.addMask(actionCommand.data);
  },
};

export default AddMaskCommandExtension;
