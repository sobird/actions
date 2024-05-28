/**
 * The `secrets` context contains the names and values of secrets that are available to a workflow run.
 * The secrets context is not available for composite actions due to security reasons.
 * If you want to pass a secret to a composite action, you need to do it explicitly as an input.
 * For more information about secrets, see "{@link https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions Using secrets in GitHub Actions}."
 *
 * `GITHUB_TOKEN` is a secret that is automatically created for every workflow run, and is always included in the secrets context.
 * For more information, see "{@link https://docs.github.com/en/actions/security-guides/automatic-token-authentication Automatic token authentication}."
 *
 * Warning: If a secret was used in the job, GitHub automatically redacts secrets printed to the log.
 * You should avoid printing secrets to the log intentionally.
 *
 * This context is the same for each job in a workflow run.
 * You can access this context from any step in a job.
 *
 * Example contents of the secrets context
 *
 * The following example contents of the secrets context shows the automatic `GITHUB_TOKEN`,
 * as well as two other secrets available to the workflow run.
 * ```json
 * {
 *   "github_token": "***",
 *   "NPM_TOKEN": "***",
 *   "SUPERSECRET": "***"
 * }
 * ```
 */
export type Secrets = Record<'GITHUB_TOKEN', string> & Record<string, string>;
