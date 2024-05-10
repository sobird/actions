/**
 * `needs` 上下文包含定义为当前作业直接依赖项的所有作业的输出。
 * 请注意，这不包括隐式依赖作业（例如依赖作业的依赖作业）。
 */
export type Needs = Record<string, {
  /**
   * 可重用工作流中作业的输出集。
   */
  outputs: Record<string, string>;
  /**
   * 可重用工作流中作业的结果。
   *
   * 可能的值为 `success`、`failure`、`cancelled` 或 `skipped`。
   */
  result: 'success' | 'failure' | 'cancelled' | 'skipped';
}>;
