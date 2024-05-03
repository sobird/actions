/**
 * Workflow is the structure of the files in .github/workflows
 *
 * @see https://docs.github.com/zh/actions/using-workflows/workflow-syntax-for-github-actions
 *
 * sobird<i@sobird.me> at 2024/05/02 21:27:38 created.
 */

class Workflow {
  constructor(
    public name: string,
    public on: any,
    public env: object,
    public jobs: object,
    public defaults: object,
  ) {

  }

  onEvent(event: string) {
    return this.on?.[event];
  }
}

export default Workflow;
