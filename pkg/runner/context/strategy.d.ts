/**
 * 对于具有矩阵的工作流，strategy 上下文包含有关当前作业的矩阵执行策略的信息。
 *
 * 此上下文针对工作流程运行中的每项作业而改变。 您可以从工作流程中的任何作业或步骤访问此上下文。
 *
 * @example
 * {
 *   "fail-fast": true,
 *   "job-index": 3,
 *   "job-total": 4,
 *   "max-parallel": 4
 * }
 */
export interface Strategy {
  /**
   * 如果此计算结果为 true，那么当矩阵中的任何作业失败时，将会取消所有正在进行的作业。
   * 有关详细信息，请参阅“{@link https://docs.github.com/zh/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idstrategyfail-fast GitHub Actions 的工作流语法}”。
   */
  'fail-fast': boolean;

  /**
   * 矩阵中当前作业的索引。 注意：此数字是从零开始的数字。 矩阵中的第一个作业索引为 0。
   */
  'job-index': number;

  /**
   * 矩阵中的作业总数。
   *
   * 注意：此数字不是从零开始的数字。 例如，对于具有四个作业的矩阵，job-total 的值为 4。
   */
  'job-total': number;

  /**
   * 使用 matrix 作业策略时可以同时运行的最大作业数。
   */
  'max-parallel': number;
}
