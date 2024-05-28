export interface Step {
  /**
   * The set of outputs defined for the step.
   * For more information, see "{@link https://docs.github.com/en/actions/creating-actions/metadata-syntax-for-github-actions#outputs-for-docker-container-and-javascript-actions Metadata syntax for GitHub Actions}."
   */
  outputs: Record<string, string>;
  /**
   * The result of a completed step after {@link https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idstepscontinue-on-error continue-on-error} is applied.
   *
   * Possible values are `success`, `failure`, `cancelled`, or `skipped`. When a continue-on-error step fails, the outcome is failure, but the final conclusion is success.
   */
  conclusion: 'success' | 'failure' | 'cancelled' | 'skipped';

  /**
   * The result of a completed step before {@link https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idstepscontinue-on-error continue-on-error} is applied.
   *
   * Possible values are `success`, `failure`, `cancelled`, or `skipped`. When a continue-on-error step fails, the outcome is failure, but the final conclusion is success.
   */
  outcome: 'success' | 'failure' | 'cancelled' | 'skipped';
}

/**
 * The `steps` context contains information about the steps in the current job that have an {@link https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idstepsid `id`} specified and have already run.
 *
 * This context changes for each step in a job. You can access this context from any step in a job.
 *
 * @example
 * ```json
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
 * ```
 */
export type Steps = Record<string, Step>;
