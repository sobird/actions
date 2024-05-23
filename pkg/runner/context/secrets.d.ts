/**
 * `secrets` 上下文包含可用于工作流运行的机密的名称和值。
 *
 * 出于安全原因，上下文 `secrets` 不适用于复合操作。 如果要将机密传递给复合操作，则需要将其作为输入显式传递
 *
 * `GITHUB_TOKEN` 是为每个工作流运行自动创建的机密，始终包含在 `secrets` 上下文中。
 *
 * @example
 * {
 *   "github_token": "***",
 *   "NPM_TOKEN": "***",
 *   "SUPERSECRET": "***"
 * }
 */
export type Secrets = Record<'GITHUB_TOKEN' | string, string>;
