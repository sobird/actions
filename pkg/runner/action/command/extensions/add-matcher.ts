// https://github.com/actions/toolkit/blob/main/docs/problem-matchers.md
import { readJsonSync } from '@/utils';

import type { CommandExtension } from '.';
import { IssueMatchersConfig } from '../IssueMatcher';

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

    console.log('file', file);

    const config = new IssueMatchersConfig(readJsonSync(file));
    console.log('config', config);
    // add
    if (config.problemMatcher.length > 0) {
      config.validate();

      // todo add matchers
    }
  },
};

export default AddMatcherCommandExtension;
