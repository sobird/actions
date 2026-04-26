import type { CommandExtension } from '.';

const Properties = {
  Owner: 'owner',
};

const RemoveMatcherCommandExtension: CommandExtension = {
  command: 'remove-matcher',
  echo: true,
  process(runner, actionCommand) {
    const owner = actionCommand.properties[Properties.Owner];
    // todo
    let file = actionCommand.data;

    // Owner and file are mutually exclusive
    if (file && owner) {
      console.warn('Either specify an owner name or a file path in ##[remove-matcher] command. Both values cannot be set.');
      return;
    }

    // Owner or file is required
    if (!file && !owner) {
      console.warn('Either an owner name or a file path must be specified in ##[remove-matcher] command.');
      return;
    }

    file = runner.container!.resolve(file);

    console.log('file', file);

    // todo
    // Remove by owner
    // Remove by file
  },
};

export default RemoveMatcherCommandExtension;
