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
      runner.warning('File path must be specified.');
      return;
    }

    const json = await runner.container.readJSON(file);
    const config = new IssueMatchersConfig(json);

    // add
    if (config.problemMatcher.length > 0) {
      config.validate();
      runner.addMatchers(config);
    }
  },
};

export default AddMatcherCommandExtension;
