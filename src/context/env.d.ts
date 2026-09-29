/**
 * The env context contains variables that have been set in a workflow, job, or step.
 * It does not contain variables inherited by the runner process.
 * For more information about setting variables in your workflow, see "{@link https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#env Workflow syntax for GitHub Actions}."
 *
 * You can retrieve the values of variables stored in env context and use these values in your workflow file.
 * You can use the env context in any key in a workflow step except for the id and uses keys.
 * For more information on the step syntax, see "{@link https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idsteps Workflow syntax for GitHub Actions}."
 *
 * If you want to use the value of a variable inside a runner, use the runner operating system's normal method for reading environment variables.
 */
export type Env = Record<string, string>;
