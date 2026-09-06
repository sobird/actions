import type { CommandExtension } from '.';
import { IssueMatchersConfig } from '../issueMatcher';

const Properties = {
  Owner: 'owner',
};

const RemoveMatcherCommandExtension: CommandExtension = {
  command: 'remove-matcher',
  echo: true,
  async process(runner, actionCommand) {
    const owner = actionCommand.properties[Properties.Owner];
    let file = actionCommand.data;

    // Owner and file are mutually exclusive
    if (file && owner) {
      runner.warning(
        'Either specify an owner name or a file path in ##[remove-matcher] command. Both values cannot be set.',
      );
      return;
    }

    // Owner or file is required
    if (!file && !owner) {
      runner.warning('Either an owner name or a file path must be specified in ##[remove-matcher] command.');
      return;
    }

    if (owner) {
      // Remove by owner
      runner.removeMatchers([owner]);
      return;
    }

    // Remove by file：读出配置里的 owner 列表（读取方式与 add-matcher.ts 一致）
    if (!runner.container) {
      return;
    }

    const json = await runner.container.readJSON(file);
    const config = new IssueMatchersConfig(json);

    if (config.problemMatcher.length > 0) {
      runner.removeMatchers(
        config.problemMatcher.map((m) => {
          return m.owner;
        }),
      );
    }
  },
};

export default RemoveMatcherCommandExtension;
