import { Container } from './container';
/**
 * The job context contains information about the currently running job.
 *
 * This context changes for each job in a workflow run. You can access this context from any step in a job.
 */
export class Job {
  /**
   * Information about the job's container.
   *
   * For more information about containers, see "{@link https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idcontainer Workflow syntax for GitHub Actions}."
   */
  container: Container;

  /**
   * The service containers created for a job.
   *
   * For more information about service containers, see "{@link https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idservices Workflow syntax for GitHub Actions}."
   */
  services: Record<string, Container>;

  /**
   * The current status of the job.
   * Possible values are `success`, `failure`, or `cancelled`.
   */
  status: 'success' | 'failure' | 'cancelled';

  constructor(job: Job) {
    this.container = new Container(job.container ?? {});
    this.services = Object.fromEntries(Object.entries(job.services ?? {}).map(([serviceId, container]) => {
      return [serviceId, new Container(container ?? {})];
    }));
    this.status = job.status ?? 'success';
  }
}
