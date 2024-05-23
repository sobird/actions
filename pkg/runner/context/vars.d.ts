/**
 * 注意：GitHub Actions 的配置变量为 beta 版本，可能会有变动。
 *
 * `vars` 上下文包含在组织、存储库和环境级别设置的自定义配置变量。
 * 有关定义用于多个工作流的配置变量的详细信息，请参阅“{@link https://docs.github.com/zh/actions/learn-github-actions/variables#defining-variables-for-multiple-workflows 变量}”。
 */
export type Vars = Record<string, string>;
