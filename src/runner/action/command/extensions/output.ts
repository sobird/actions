import util from 'node:util';

import { create } from '@bufbuild/protobuf';

import { Constants } from '@/common/constants';
import { IssueSchema, IssueType } from '@/gen/runner/v1/messages_pb';

import type { CommandExtension } from '.';

const Properties = {
  Name: 'name',
};

const SetOutputCommandExtension: CommandExtension = {
  command: 'set-output',
  echo: true,
  process(runner, actionCommand) {
    if (runner.context.vars['DistributedTask.DeprecateStepOutputCommands']) {
      const issue = create(IssueSchema, {
        type: IssueType.WARNING,
        message: util.format(Constants.Runner.UnsupportedCommandMessage, this.command),
        data: {
          [Constants.Runner.InternalTelemetryIssueDataKey]: Constants.Runner.UnsupportedCommand,
        },
      });
      runner.addIssue(issue);
    }

    const key = actionCommand.properties[Properties.Name];

    if (!key) {
      throw new Error("Required field 'name' is missing in ##[set-output] command.");
    }

    const result = runner.setOutput(key, actionCommand.data);
    if (result) {
      runner.debug(`${result}='${actionCommand.data}'`);
    }
  },
};

export default SetOutputCommandExtension;
