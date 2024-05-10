/**
 * jobs 上下文仅在可重用工作流中可用，并且只能用于设置可重用工作流的输出。
 * 有关详细信息，请参阅“{@link https://docs.github.com/zh/actions/using-workflows/reusing-workflows#using-outputs-from-a-reusable-workflow 重新使用工作流}”。
 *
 * @example
 * ```json
 * {
 *    "example_job": {
 *       "result": "success",
 *       "outputs": {
 *           "output1": "hello",
 *            "output2": "world"
 *       }
 *    }
 * }
 * ```
 */
export type Jobs = Record<string, {
  /**
   * 可重用工作流中作业的结果。 可能的值为 `success`、`failure`、`cancelled` 或 `skipped`。
   */
  result: 'success' | 'failure' | 'cancelled' | 'skipped';
  /**
   * 可重用工作流中作业的输出集。
   */
  outputs: Record<string, string>;
}>;
