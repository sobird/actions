/**
 * The jobs context is only available in reusable workflows, and can only be used to set outputs for a reusable workflow.
 * For more information, see "{@link https://docs.github.com/en/actions/using-workflows/reusing-workflows#using-outputs-from-a-reusable-workflow Reusing workflows}."
 *
 * This is only available in reusable workflows, and can only be used to set outputs for a reusable workflow.
 *
 * @example
 * ```json
 * {
 *    "example_job": {
 *       "result": "success",
 *       "outputs": {
 *          "output1": "hello",
 *          "output2": "world"
 *       }
 *    }
 * }
 * ```
 */
export class Jobs {
  [index: string]: {
    /**
   * The result of a job in the reusable workflow. Possible values are `success`, `failure`, `cancelled`, or `skipped`.
   */
    result: 'success' | 'failure' | 'cancelled' | 'skipped';

    /**
   * The set of outputs of a job in a reusable workflow.
   */
    outputs: Record<string, string>;
  }

  constructor(jobs: Jobs) {
    Object.entries(jobs).forEach(([jobId, job]) => {
      this[jobId] = {
        result: job.result,
        outputs: { ...job.outputs },
      };
    });
  }
}
