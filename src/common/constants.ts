// https://github.com/actions/runner/blob/main/src/Runner.Common/Constants.cs

import os from 'node:os';
import path from 'node:path';

export const ACTIONS_HOME = path.join(os.homedir(), '.actions');

export const WellKnownDirectory = {
  Work: 'work',
  Bin: 'bin',
  Diag: 'diag',
  get Actions() {
    return path.join(this.Work, 'actions');
  },
  get Externals() {
    return path.join(WellKnownDirectory.Work, 'externals');
  },
  get Temp() {
    return path.join(WellKnownDirectory.Work, 'temp');
  },
  get Tool() {
    return path.join(WellKnownDirectory.Work, 'tool');
  },
  get Update() {
    return path.join(WellKnownDirectory.Work, 'update');
  },
};

export enum WellKnownConfigFile {
  Runner,
  MigratedRunner,
  Credentials,
  MigratedCredentials,
  RSACredentials,
  Service,
  CredentialStore,
  Certificates,
  Options,
  SetupInfo,
  Telemetry,
}

export enum OSPlatform {
  OSX,
  Linux,
  Windows,
}

export enum Architecture {
  X86,
  X64,
  Arm,
  Arm64,
}

export namespace Constants {
  // 根据操作系统选择 PATH 环境变量名
  export const PathVariable = process.platform === 'win32' ? 'Path' : 'PATH';
  export const ProcessTrackingId = 'RUNNER_TRACKING_ID';
  export const PluginTracePrefix = '##[plugin.trace]';
  export const RunnerDownloadRetryMaxAttempts = 3;
  export const CompositeActionsMaxDepth = 9;

  export namespace Runner {
    // 根据运行环境确定平台和架构
    export const Platform: OSPlatform =
      process.platform === 'win32'
        ? OSPlatform.Windows
        : process.platform === 'darwin'
          ? OSPlatform.OSX
          : OSPlatform.Linux;

    export const PlatformArchitecture: Architecture = (() => {
      switch (process.arch) {
        case 'ia32':
          return Architecture.X86;
        case 'x64':
          return Architecture.X64;
        case 'arm':
          return Architecture.Arm;
        case 'arm64':
          return Architecture.Arm64;
        default:
          return Architecture.X64;
      }
    })();

    // TimeSpan.FromSeconds(30) 转为秒数
    export const ExitOnUnloadTimeout = 30;

    export namespace CommandLine {
      export namespace Args {
        export const Auth = 'auth';
        export const Labels = 'labels';
        export const MonitorSocketAddress = 'monitorsocketaddress';
        export const Name = 'name';
        export const RunnerGroup = 'runnergroup';
        export const StartupType = 'startuptype';
        export const Url = 'url';
        export const UserName = 'username';
        export const WindowsLogonAccount = 'windowslogonaccount';
        export const Work = 'work';

        // 机密参数
        export const Token = 'token';
        export const PAT = 'pat';
        export const WindowsLogonPassword = 'windowslogonpassword';
        export const JitConfig = 'jitconfig';
        export const Secrets = [PAT, Token, WindowsLogonPassword, JitConfig] as const;
      }

      export namespace Commands {
        export const Configure = 'configure';
        export const Remove = 'remove';
        export const Run = 'run';
        export const Warmup = 'warmup';
      }

      export namespace Flags {
        export const Check = 'check';
        export const Commit = 'commit';
        export const Ephemeral = 'ephemeral';
        export const GenerateServiceConfig = 'generateServiceConfig';
        export const Help = 'help';
        export const Local = 'local';
        export const NoDefaultLabels = 'no-default-labels';
        export const Replace = 'replace';
        export const DisableUpdate = 'disableupdate';
        export const Once = 'once';
        export const RunAsService = 'runasservice';
        export const Unattended = 'unattended';
        export const Version = 'version';
      }
    }

    export namespace ReturnCode {
      export const Success = 0;
      export const TerminatedError = 1;
      export const RetryableError = 2;
      export const RunnerUpdating = 3;
      export const RunOnceRunnerUpdating = 4;
      export const SessionConflict = 5;
      export const RunnerConfigurationRefreshed = 6;
      export const RunnerVersionDeprecated = 7;
    }

    export namespace Features {
      export const DiskSpaceWarning = 'runner.diskspace.warning';
      export const LogTemplateErrorsAsDebugMessages = 'DistributedTask.LogTemplateErrorsAsDebugMessages';
      export const UseContainerPathForTemplate = 'DistributedTask.UseContainerPathForTemplate';
      export const AllowRunnerContainerHooks = 'DistributedTask.AllowRunnerContainerHooks';
      export const AddCheckRunIdToJobContext = 'actions_add_check_run_id_to_job_context';
      export const DisplayHelpfulActionsDownloadErrors = 'actions_display_helpful_actions_download_errors';
      export const SnapshotPreflightHostedRunnerCheck = 'actions_snapshot_preflight_hosted_runner_check';
      export const SnapshotPreflightImageGenPoolCheck = 'actions_snapshot_preflight_image_gen_pool_check';
      export const CompareWorkflowParser = 'actions_runner_compare_workflow_parser';
      export const ServiceContainerCommand = 'actions_service_container_command';
      export const SetOrchestrationIdEnvForActions = 'actions_set_orchestration_id_env_for_actions';
      export const SendJobLevelAnnotations = 'actions_send_job_level_annotations';
      export const EmitCompositeMarkers = 'actions_runner_emit_composite_markers';
      export const BatchActionResolution = 'actions_batch_action_resolution';
      export const UseBearerTokenForCodeload = 'actions_use_bearer_token_for_codeload';
      export const OverrideDebuggerWelcomeMessage = 'actions_runner_override_debugger_welcome_message';
      export const AllowArtifactsFile = 'actions_runner_allow_artifacts_file';
      export const SelfRepository = 'actions_self_repository';
    }

    export namespace InfrastructureFailureCategories {
      export const DebuggerTunnelFailure = 'debugger_tunnel_failure';
    }

    export namespace NodeMigration {
      export const Node20 = 'node20';
      export const Node24 = 'node24';
      export const ForceNode24Variable = 'FORCE_JAVASCRIPT_ACTIONS_TO_NODE24';
      export const AllowUnsecureNodeVersionVariable = 'ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION';
      export const UseNode24ByDefaultFlag = 'actions.runner.usenode24bydefault';
      export const RequireNode24Flag = 'actions.runner.requirenode24';
      export const WarnOnNode20Flag = 'actions.runner.warnonnode20';
      export const DeprecateLinuxArm32Flag = 'actions_runner_deprecate_linux_arm32';
      export const KillLinuxArm32Flag = 'actions_runner_kill_linux_arm32';
      export const Node20DeprecationUrl =
        'https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/';
      export const Node24DefaultDate = 'June 16th, 2026';
      export const Node20RemovalDate = 'September 16th, 2026';
      export const Node24DefaultDateVariable = 'actions_runner_node24_default_date';
      export const Node20RemovalDateVariable = 'actions_runner_node20_removal_date';
      export const LinuxArm32DeprecationMessage =
        'Linux ARM32 runners are deprecated and will no longer be supported after {0}. Please migrate to a supported platform.';
    }

    export const InternalTelemetryIssueDataKey = '_internal_telemetry';
    export const TelemetryRecordId = '11111111-1111-1111-1111-111111111111'; // TelemetryRecordId = new Guid('11111111-1111-1111-1111-111111111111');
    export const WorkerCrash = 'WORKER_CRASH';
    export const LowDiskSpace = 'LOW_DISK_SPACE';
    export const UnsupportedCommand = 'UNSUPPORTED_COMMAND';
    export const ResultsUploadFailure = 'RESULTS_UPLOAD_FAILURE';
    export const UnsupportedCommandMessage =
      'The `%s` command is deprecated and will be disabled soon. Please upgrade to using Environment Files. For more information see: https://github.blog/changelog/2022-10-11-github-actions-deprecating-save-state-and-set-output-commands/';
    export const UnsupportedCommandMessageDisabled =
      'The `%s` command is disabled. Please upgrade to using Environment Files or opt into unsecure command execution by setting the `ACTIONS_ALLOW_UNSECURE_COMMANDS` environment variable to `true`. For more information see: https://github.blog/changelog/2020-10-01-github-actions-deprecating-set-env-and-add-path-commands/';

    export const UnsupportedStopCommandTokenDisabled =
      "You cannot use a endToken that is an empty string, the string 'pause-logging', or another workflow command. For more information see: https://docs.github.com/actions/learn-github-actions/workflow-commands-for-github-actions#example-stopping-and-starting-workflow-commands or opt into insecure command execution by setting the `ACTIONS_ALLOW_UNSECURE_STOPCOMMAND_TOKENS` environment variable to `true`.";

    export const UnsupportedSummarySize =
      '$GITHUB_STEP_SUMMARY upload aborted, supports content up to a size of %sk, got %sk. For more information see: https://docs.github.com/actions/using-workflows/workflow-commands-for-github-actions#adding-a-markdown-summary';

    export const SummaryUploadError =
      '$GITHUB_STEP_SUMMARY upload aborted, an error occurred when uploading the summary. For more information see: https://docs.github.com/actions/using-workflows/workflow-commands-for-github-actions#adding-a-markdown-summary';

    export const DetectedNodeAfterEndOfLifeMessage =
      'Node.js 16 actions are deprecated. Please update the following actions to use Node.js 20: {0}. For more information see: https://github.blog/changelog/2023-09-22-github-actions-transitioning-from-node-16-to-node-20/.';

    export const DeprecatedNodeDetectedAfterEndOfLifeActions = 'DeprecatedNodeActionsMessageWarnings';

    export const DeprecatedNodeVersion = 'node16';

    export const EnforcedNode12DetectedAfterEndOfLife =
      'The following actions uses node12 which is deprecated and will be forced to run on node16: {0}. For more info: https://github.blog/changelog/2023-06-13-github-actions-all-actions-will-run-on-node16-instead-of-node12-by-default/';

    export const EnforcedNode12DetectedAfterEndOfLifeEnvVariable = 'Node16ForceActionsWarnings';

    export const EnforcedNode16DetectedAfterEndOfLife =
      'The following actions uses Node.js version which is deprecated and will be forced to run on node20: {0}. For more info: https://github.blog/changelog/2024-03-07-github-actions-all-actions-will-run-on-node20-instead-of-node16-by-default/';

    export const EnforcedNode16DetectedAfterEndOfLifeEnvVariable = 'Node20ForceActionsWarnings';

    export const ArtifactsFileSizeExceeded =
      '$GITHUB_ARTIFACTS file exceeds the maximum size of {0} KiB (got {1} KiB).';
    export const ArtifactsAggregateLimitExceeded = 'The job has exceeded the maximum of {0} declared artifacts.';
    export const ArtifactsInvalidLine = 'Invalid $GITHUB_ARTIFACTS entry on line {0}: {1}';
    export const ArtifactsConflictingDigest =
      "Conflicting digest for artifact '{0}': previously declared as '{1}', now declared as '{2}'.";
  }

  export namespace RunnerEvent {
    export const Register = 'register';
    export const Remove = 'remove';
  }

  export namespace Pipeline {
    export namespace Path {
      export const PipelineMappingDirectory = '_PipelineMapping';
      export const TrackingConfigFile = 'PipelineFolder.json';
    }
  }

  export namespace Configuration {
    export const OAuthAccessToken = 'OAuthAccessToken';
    export const OAuth = 'OAuth';
  }

  export namespace Expressions {
    export const Always = 'always';
    export const Cancelled = 'cancelled';
    export const Failure = 'failure';
    export const Success = 'success';
  }

  export namespace Hooks {
    export const JobStartedStepName = 'Set up runner';
    export const JobCompletedStepName = 'Complete runner';
    export const ContainerHooksPath = 'ACTIONS_RUNNER_CONTAINER_HOOKS';
  }

  export namespace Path {
    export const ActionsDirectory = '_actions';
    export const ActionManifestYmlFile = 'action.yml';
    export const ActionManifestYamlFile = 'action.yaml';
    export const BinDirectory = 'bin';
    export const DiagDirectory = '_diag';
    export const ExternalsDirectory = 'externals';
    export const RunnerDiagnosticLogPrefix = 'Runner_';
    export const TempDirectory = '_temp';
    export const ToolDirectory = '_tool';
    export const UpdateDirectory = '_update';
    export const WorkDirectory = '_work';
    export const WorkerDiagnosticLogPrefix = 'Worker_';
  }

  export namespace Variables {
    export const MacroPrefix = '$(';
    export const MacroSuffix = ')';

    export namespace Actions {
      export const AllowUnsupportedCommands = 'ACTIONS_ALLOW_UNSECURE_COMMANDS';
      export const AllowUnsupportedStopCommandTokens = 'ACTIONS_ALLOW_UNSECURE_STOPCOMMAND_TOKENS';
      export const ManualForceActionsToNode20 = 'FORCE_JAVASCRIPT_ACTIONS_TO_NODE20';
      export const RequireJobContainer = 'ACTIONS_RUNNER_REQUIRE_JOB_CONTAINER';
      export const ReturnVersionDeprecatedExitCode = 'ACTIONS_RUNNER_RETURN_VERSION_DEPRECATED_EXIT_CODE';
      export const RunnerDebug = 'ACTIONS_RUNNER_DEBUG';
      export const StepDebug = 'ACTIONS_STEP_DEBUG';
      export const CacheUrl = 'ACTIONS_CACHE_URL';
      export const RuntimeUrl = 'ACTIONS_RUNTIME_URL';
      export const RuntimeToken = 'ACTIONS_RUNTIME_TOKEN';
    }

    export namespace Agent {
      export const ToolsDirectory = 'agent.ToolsDirectory';
      export const ForcedInternalNodeVersion = 'ACTIONS_RUNNER_FORCED_INTERNAL_NODE_VERSION';
      export const ForcedActionsNodeVersion = 'ACTIONS_RUNNER_FORCE_ACTIONS_NODE_VERSION';
      export const PrintLogToStdout = 'ACTIONS_RUNNER_PRINT_LOG_TO_STDOUT';
      export const DisableStdoutMultilineLogPrefixing = 'ACTIONS_RUNNER_DISABLE_STDOUT_MULTILINE_LOG_PREFIXING';
      export const ActionArchiveCacheDirectory = 'ACTIONS_RUNNER_ACTION_ARCHIVE_CACHE';
      export const SymlinkCachedActions = 'ACTIONS_RUNNER_SYMLINK_CACHED_ACTIONS';
      export const EmitCompositeMarkers = 'ACTIONS_RUNNER_EMIT_COMPOSITE_MARKERS';
    }

    export namespace System {
      export const AccessToken = 'system.accessToken';
      export const Culture = 'system.culture';
      export const PhaseDisplayName = 'system.phaseDisplayName';
      export const JobRequestType = 'system.jobRequestType';
      export const OrchestrationId = 'system.orchestrationId';
    }
  }

  export namespace OperatingSystem {
    export const Windows11BuildVersion = 22000;
    export const Windows11MajorVersion = 10;
  }

  export namespace Protocol {
    export const PathPrefix = '/api/actions';
    export const XRunnerUUID = 'x-runner-uuid';
    export const XRunnerToken = 'x-runner-token';
    export const XRunnerVersion = 'x-runner-version';
  }
}
