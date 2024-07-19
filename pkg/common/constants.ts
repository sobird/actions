/* eslint-disable max-classes-per-file */

// Related to definition variables.
import path from 'node:path';

class Actions {
  //
  // Keep alphabetical
  //
  public static readonly AllowUnsupportedCommands = 'ACTIONS_ALLOW_UNSECURE_COMMANDS';

  public static readonly AllowUnsupportedStopCommandTokens = 'ACTIONS_ALLOW_UNSECURE_STOPCOMMAND_TOKENS';

  public static readonly AllowActionsUseUnsecureNodeVersion = 'ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION';

  public static readonly ManualForceActionsToNode20 = 'FORCE_JAVASCRIPT_ACTIONS_TO_NODE20';

  public static readonly RequireJobContainer = 'ACTIONS_RUNNER_REQUIRE_JOB_CONTAINER';

  public static readonly RunnerDebug = 'ACTIONS_RUNNER_DEBUG';

  public static readonly StepDebug = 'ACTIONS_STEP_DEBUG';
}

class Variables {
  public static readonly Actions = Actions;
}

class Runner {
  public static readonly InternalTelemetryIssueDataKey = '_internal_telemetry';

  // public static readonly TelemetryRecordId = new Guid('11111111-1111-1111-1111-111111111111');

  public static readonly WorkerCrash = 'WORKER_CRASH';

  public static readonly LowDiskSpace = 'LOW_DISK_SPACE';

  public static readonly UnsupportedCommand = 'UNSUPPORTED_COMMAND';

  public static readonly ResultsUploadFailure = 'RESULTS_UPLOAD_FAILURE';

  public static readonly UnsupportedCommandMessage = 'The `%s` command is deprecated and will be disabled soon. Please upgrade to using Environment Files. For more information see: https://github.blog/changelog/2022-10-11-github-actions-deprecating-save-state-and-set-output-commands/';

  public static readonly UnsupportedCommandMessageDisabled = 'The %s command is disabled. Please upgrade to using Environment Files or opt into unsecure command execution by setting the `ACTIONS_ALLOW_UNSECURE_COMMANDS` environment variable to `true`. For more information see: https://github.blog/changelog/2020-10-01-github-actions-deprecating-set-env-and-add-path-commands/';

  public static readonly UnsupportedStopCommandTokenDisabled = "You cannot use a endToken that is an empty string, the string 'pause-logging', or another workflow command. For more information see: https://docs.github.com/actions/learn-github-actions/workflow-commands-for-github-actions#example-stopping-and-starting-workflow-commands or opt into insecure command execution by setting the `ACTIONS_ALLOW_UNSECURE_STOPCOMMAND_TOKENS` environment variable to `true`.";

  public static readonly UnsupportedSummarySize = '$GITHUB_STEP_SUMMARY upload aborted, supports content up to a size of %sk, got %sk. For more information see: https://docs.github.com/actions/using-workflows/workflow-commands-for-github-actions#adding-a-markdown-summary';

  public static readonly SummaryUploadError = '$GITHUB_STEP_SUMMARY upload aborted, an error occurred when uploading the summary. For more information see: https://docs.github.com/actions/using-workflows/workflow-commands-for-github-actions#adding-a-markdown-summary';

  public static readonly DetectedNodeAfterEndOfLifeMessage = 'Node.js 16 actions are deprecated. Please update the following actions to use Node.js 20: {0}. For more information see: https://github.blog/changelog/2023-09-22-github-actions-transitioning-from-node-16-to-node-20/.';

  public static readonly DeprecatedNodeDetectedAfterEndOfLifeActions = 'DeprecatedNodeActionsMessageWarnings';

  public static readonly DeprecatedNodeVersion = 'node16';

  public static readonly EnforcedNode12DetectedAfterEndOfLife = 'The following actions uses node12 which is deprecated and will be forced to run on node16: {0}. For more info: https://github.blog/changelog/2023-06-13-github-actions-all-actions-will-run-on-node16-instead-of-node12-by-default/';

  public static readonly EnforcedNode12DetectedAfterEndOfLifeEnvVariable = 'Node16ForceActionsWarnings';

  public static readonly EnforcedNode16DetectedAfterEndOfLife = 'The following actions uses Node.js version which is deprecated and will be forced to run on node20: {0}. For more info: https://github.blog/changelog/2024-03-07-github-actions-all-actions-will-run-on-node20-instead-of-node16-by-default/';

  public static readonly EnforcedNode16DetectedAfterEndOfLifeEnvVariable = 'Node20ForceActionsWarnings';
}

// export enum Directory {
//   // eslint-disable-next-line @typescript-eslint/no-shadow
//   Actions = 'actions',

//   Bin = 'bin',

//   Diag = 'diag',

//   Externals = 'externals',

//   Temp = 'temp',

//   Tools = 'tool',

//   Update = 'update',

//   Work = 'work',
// }

const Directory = {
  Work: 'work',

  Bin: 'bin',

  Diag: 'diag',

  get Actions() { return path.join(this.Work, 'actions'); },

  get Externals() { return path.join(Directory.Work, 'externals'); },

  get Temp() { return path.join(Directory.Work, 'temp'); },

  get Tool() { return path.join(Directory.Work, 'tool'); },

  get Update() { return path.join(Directory.Work, 'update'); },
};

class Constants {
  public static readonly Runner = Runner;

  public static readonly Variables = Variables;

  public static readonly Directory = Directory;

  public static readonly CompositeActionsMaxDepth = 9;
}

export default Constants;
