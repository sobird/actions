/**
 * The `needs` context contains outputs from all jobs that are defined as a direct dependency of the current job.
 * Note that this doesn't include implicitly dependent jobs (for example, dependent jobs of a dependent job).
 * For more information on defining job dependencies, see "{@link https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idneeds Workflow syntax for GitHub Actions}."
 *
 * This context is only populated for workflow runs that have dependent jobs, and changes for each job in a workflow run.
 * You can access this context from any job or step in a workflow.
 *
 * Example contents of the needs context
 *
 * The following example contents of the needs context shows information for two jobs that the current job depends on.
 * ```json
 * {
 *   "build": {
 *     "result": "success",
 *     "outputs": {
 *       "build_id": "123456"
 *     }
 *   },
 *   "deploy": {
 *     "result": "failure",
 *     "outputs": {}
 *   }
 * }
 * ```
 */
export class Needs {
  [index: string]: {
    /**
     * The set of outputs of a job that the current job depends on.
     */
    outputs: Record<string, string>;
    /**
     * The result of a job that the current job depends on.
     * Possible values are `success`, `failure`, `cancelled`, or `skipped`.
     */
    result: 'success' | 'failure' | 'cancelled' | 'skipped';
  }

  constructor(needs: Needs) {
    Object.entries(needs).forEach(([needId, need]) => {
      this[needId] = {
        result: need.result,
        outputs: need.outputs ?? {},
      };
    });
  }
}
