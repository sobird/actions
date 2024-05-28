export interface Container {
  image: string;
  credentials: {
    username: string;
    password: string;
  }
  env: object;
  /**
   * The exposed ports of the service container.
   */
  ports: Record<string, string>;
  volumes: Record<string, string>;
  options: string[];
  /**
   * The ID of the service container.
   */
  id: string;
  /**
   * The ID of the service container network.
   * The runner creates the network used by all containers in a job.
   */
  network: string;
}

/**
 * The job context contains information about the currently running job.
 *
 * This context changes for each job in a workflow run. You can access this context from any step in a job.
 */
export interface Job {
  /**
   * Information about the job's container.
   *
   * For more information about containers, see "{@link https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idcontainer Workflow syntax for GitHub Actions}."
   */
  container: Container
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
}
