/**
 * For workflows with a matrix, the `matrix` context contains the matrix properties defined in the workflow file that apply to the current job.
 * For example, if you configure a matrix with the `os` and `node` keys, the `matrix` context object includes the os and node properties with the values that are being used for the current job.
 *
 * There are no standard properties in the `matrix` context, only those which are defined in the workflow file.
 *
 * This context is only available for jobs in a matrix, and changes for each job in a workflow run.
 * You can access this context from any job or step in a workflow.
 *
 * Example contents of the matrix context
 *
 * The following example contents of the `matrix` context is from a job in a matrix that has the `os` and `node` matrix properties defined in the workflow.
 * The job is executing the matrix combination of an `ubuntu-latest` OS and Node.js version `16`.
 * ```json
 * {
 *  "os": "ubuntu-latest",
 *  "node": 16
 * }
 * ```
 */
export type Matrix = Record<string, string[]>;
