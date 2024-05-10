/**
 * runner 上下文包含正在执行当前作业的运行器相关信息。
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
export interface Runner {
  /**
   * 执行作业的运行器的名称。
   *
   * 此名称在工作流运行中可能并不唯一，因为存储库和组织级别的运行器可以使用同一名称。
   */
  name: string;
  /**
   * 执行作业的运行器的操作系统。
   *
   * 可能的值为 `Linux`、`Windows` 或 `macOS`。
   */
  os: 'Linux' | 'Windows' | 'macOS';

  /**
   * 执行作业的运行器的体系结构。
   *
   * 可能的值为 X86、X64、ARM 或 ARM64。
   */
  arch: 'X86' | 'X64' | 'ARM' | 'ARM64';

  /**
   * 运行器临时目录的路径。
   *
   * 此目录在每个作业的开始和结束时都是空的。
   * 注意，如果运行者的用户帐户没有权限删除这些文件，则不会被删除。
   */
  temp: string;

  /**
   * 包含 GitHub 托管运行器预安装工具的目录路径。
   * 有关详细信息，请参阅“{@link https://docs.github.com/zh/actions/using-github-hosted-runners/about-github-hosted-runners#supported-software 使用 GitHub 托管的运行器}”。
   */
  tool_cache: string;
  /**
   * 仅当启用{@link https://docs.github.com/zh/actions/monitoring-and-troubleshooting-workflows/enabling-debug-logging 调试日志记录}并且始终具有值 1 时，才会进行此设置。
   * 它可以用作指示器，以便在自己的作业步骤中启用更多调试或详细日志记录。
   */
  debug: string;

  /**
   * 执行作业的运行器的环境。
   *
   * 可能的值包括：对于 GitHub 提供的 GitHub 托管的运行器为 `github-hosted`，对于存储库所有者配置的自承载运行器为 `self-hosted`。
   */
  environment: 'github-hosted' | 'self-hosted`';
}
