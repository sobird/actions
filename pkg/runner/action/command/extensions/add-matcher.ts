// https://github.com/actions/toolkit/blob/main/docs/problem-matchers.md

import type { CommandExtension } from '.';
import { IssueMatchersConfig } from '../issueMatcher';

const AddMatcherCommandExtension: CommandExtension = {
  command: 'add-matcher',
  echo: true,
  async process(runner, actionCommand) {
    if (!runner.container) {
      return;
    }

    // todo
    const file = actionCommand.data;
    // File is required
    if (!file) {
      console.warn('File path must be specified.');
      return;
    }

    const res = await runner.container.readJSON(file);
    const config = new IssueMatchersConfig(res);

    // add
    if (config.problemMatcher.length > 0) {
      config.validate();
      runner.addMatchers(config);
    }
  },
};

export default AddMatcherCommandExtension;
