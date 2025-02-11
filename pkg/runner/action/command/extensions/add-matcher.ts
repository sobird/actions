// https://github.com/actions/toolkit/blob/main/docs/problem-matchers.md
import { readJsonSync } from '@/utils';

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

    if (runner.container) {
      file = runner.container!.resolve(file);
    }

    console.log('file', file, runner.context.github.workspace);

    const ddd = readJsonSync(file);

    // add by file
  },
};

export default AddMatcherCommandExtension;
