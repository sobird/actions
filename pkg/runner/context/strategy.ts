/**
 * For workflows with a matrix, the `strategy` context contains information about the matrix execution strategy for the current job.
 *
 * This context changes for each job in a workflow run.
 * You can access this context from any job or step in a workflow.
 *
 * Example contents of the strategy context
 *
 * The following example contents of the `strategy` context is from a matrix with four jobs, and is taken from the final job.
 * Note the difference between the zero-based `job-index` number, and job-total which is not zero-based.
 * ```json
 * {
 *   "fail-fast": true,
 *   "job-index": 3,
 *   "job-total": 4,
 *   "max-parallel": 4
 * }
 * ```
 */
export class Strategy {
  /**
   * When this evaluates to true, all in-progress jobs are canceled if any job in a matrix fails.
   * For more information, see "{@link https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idstrategyfail-fast Workflow syntax for GitHub Actions}."
   */
  'fail-fast': boolean;

  /**
   * The index of the current job in the matrix.
   * ***Note:*** This number is a zero-based number. The first job's index in the matrix is `0`.
   */
  'job-index': number;

  /**
   * The total number of jobs in the matrix.
   * ***Note:*** This number is not a zero-based number.
   * For example, for a matrix with four jobs, the value of job-total is `4`.
   */
  'job-total': number;

  /**
   * The maximum number of jobs that can run simultaneously when using a matrix job strategy.
   * For more information, see "{@link https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idstrategymax-parallel Workflow syntax for GitHub Actions}."
   */
  'max-parallel': number;

  constructor(strategy: Strategy) {
    this['fail-fast'] = strategy['fail-fast'];
    this['job-index'] = strategy['job-index'];
    this['job-total'] = strategy['job-total'];
    this['max-parallel'] = strategy['max-parallel'];
  }
}
