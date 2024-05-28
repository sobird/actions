/**
 * The `runner` context contains information about the runner that is executing the current job.
 *
 * This context changes for each job in a workflow run.
 *
 * @example
 * {
 *   "os": "Linux",
 *   "arch": "X64",
 *   "name": "GitHub Actions 2",
 *   "tool_cache": "/opt/hostedtoolcache",
 *   "temp": "/home/runner/work/_temp"
 * }
 */
export class Runner {
  /**
   * The name of the runner executing the job.
   * This name may not be unique in a workflow run as runners at the repository and organization levels could use the same name.
   */
  name: string;

  /**
   * The operating system of the runner executing the job. Possible values are `Linux`, `Windows`, or `macOS`.
   */
  os: 'Linux' | 'Windows' | 'macOS';

  /**
   * The architecture of the runner executing the job. Possible values are `X86`, `X64`, `ARM`, or `ARM64`.
   */
  arch: 'X86' | 'X64' | 'ARM' | 'ARM64';

  /**
   * The path to a temporary directory on the runner.
   * This directory is emptied at the beginning and end of each job.
   * Note that files will not be removed if the runner's user account does not have permission to delete them.
   */
  temp: string;

  /**
   * The path to the directory containing preinstalled tools for GitHub-hosted runners.
   * For more information, see "{@link https://docs.github.com/en/actions/using-github-hosted-runners/about-github-hosted-runners#supported-software Using GitHub-hosted runners}".
   */
  tool_cache: string;

  /**
   * This is set only if {@link https://docs.github.com/en/actions/monitoring-and-troubleshooting-workflows/enabling-debug-logging debug logging} is enabled, and always has the value of 1.
   * It can be useful as an indicator to enable additional debugging or verbose logging in your own job steps.
   */
  debug: string;

  /**
   * The environment of the runner executing the job.
   * Possible values are: `github-hosted` for GitHub-hosted runners provided by GitHub, and `self-hosted` for self-hosted runners configured by the repository owner.
   */
  environment: 'github-hosted' | 'self-hosted`';

  constructor(runner: Runner) {
    this.name = runner.name;
    this.os = runner.os;
    this.arch = runner.arch;
    this.temp = runner.temp;
    this.tool_cache = runner.tool_cache;
    this.debug = runner.debug;
    this.environment = runner.environment;
  }
}
