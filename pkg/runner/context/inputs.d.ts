/**
 * The `inputs` context contains input properties passed to an action, to a reusable workflow, or to a manually triggered workflow.
 * For reusable workflows, the input names and types are defined in the {@link https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#workflow-reuse-events `workflow_call` event configuration} of a reusable workflow,
 * and the input values are passed from {@link https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idwith `jobs.<job_id>.with`} in an external workflow that calls the reusable workflow.
 * For manually triggered workflows, the inputs are defined in the {@link https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#workflow_dispatch `workflow_dispatch` event configuration} of a workflow.
 *
 * The properties in the inputs context are defined in the workflow file.
 * They are only available in a {@link https://docs.github.com/en/actions/using-workflows/reusing-workflows reusable workflow} or in a workflow triggered by the {@link https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#workflow_dispatch `workflow_dispatch` event}
 *
 * This context is only available in a reusable workflow or in a workflow triggered by the workflow_dispatch event.
 * You can access this context from any job or step in a workflow.
 *
 * Example contents of the inputs context
 *
 * The following example contents of the `inputs` context is from a workflow that has defined the `build_id`, `deploy_target`, and `perform_deploy` inputs.
 * ```json
 * {
 *   "build_id": 123456768,
 *   "deploy_target": "deployment_sys_1a",
 *   "perform_deploy": true
 * }
 * ```
 */
export type Inputs = Record<string, string | number | boolean>;
