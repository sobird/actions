export interface Step {
  /**
   * 为步骤定义的输出集。 有关详细信息，请参阅“{@link https://docs.github.com/zh/actions/creating-actions/metadata-syntax-for-github-actions#outputs-for-docker-container-and-javascript-actions GitHub Actions 的元数据语法}”。
   */
  outputs: Record<string, string>;
  /**
   * 应用 {@link https://docs.github.com/zh/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idstepscontinue-on-error continue-on-error} 后完成的步骤的结果。
   *
   * 可能的值为 `success`、`failure`、`cancelled` 或 `skipped`。
   * 当 `continue-on-error` 步骤失败时，`outcome` 是 `failure`，但最终 `conclusion` 是 `success`。
   */
  conclusion: 'success' | 'failure' | 'cancelled' | 'skipped';

  /**
   * 应用 continue-on-error 前完成的步骤的结果。
   *
   * 可能的值为 success、failure、cancelled 或 skipped。
   * 当 continue-on-error 步骤失败时，outcome 是 failure，但最终 conclusion 是 success。
   */
  outcome: 'success' | 'failure' | 'cancelled' | 'skipped';
}

/**
 * `steps` 上下文包含有关当前作业中已指定 id 且已运行的步骤的信息。
 *
 * 此上下文针对作业中的每个步骤而改变。 您可以从作业中的任何步骤访问此上下文。
 *
 * @example
 * {
 *   "checkout": {
 *     "outputs": {},
 *     "outcome": "success",
 *     "conclusion": "success"
 *   },
 *   "generate_number": {
 *     "outputs": {
 *       "random_number": "1"
 *     },
 *     "outcome": "success",
 *     "conclusion": "success"
 *   }
 * }
 */
export type Steps = Record<string, Step>;
