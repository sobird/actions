import type { CommandExtension } from '.';

const AddMatcherCommandExtension: CommandExtension = {
  command: 'add-matcher',
  echo: true,
  process(runner, actionCommand) {
    // todo
    let file = actionCommand.data;

    // File is required
    if (!file) {
      console.warn('File path must be specified.');
      return;
    }

    file = runner.container!.resolve(file);

    console.log('file', file);

    // add by file
  },
};

export default AddMatcherCommandExtension;
