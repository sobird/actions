import util from 'node:util';

import { create } from '@bufbuild/protobuf';

import { Constants } from '@/common/constants';
import { IssueSchema, IssueType } from '@/gen/runner/v1/messages_pb';

import type { CommandExtension } from '.';

const Properties = {
  Name: 'name',
};

const SaveStateCommandExtension: CommandExtension = {
  command: 'save-state',
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

    // @todo JobTelemetry("DeprecatedCommand: save-state", 仅一次)：项目暂无 telemetry 通道

    const key = actionCommand.properties[Properties.Name];

    if (!key) {
      throw new Error("Required field 'name' is missing in ##[save-state] command.");
    }

    runner.saveState(key, actionCommand.data);
  },
};

export default SaveStateCommandExtension;
