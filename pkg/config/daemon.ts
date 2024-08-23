class Daemon {
  /**
   * Execute how many tasks concurrently at the same time.
   */
  public capacity: number;

  /**
   * The timeout for a job to be finished.
   * Please note that the Gitea instance also has a timeout (3h by default) for the job.
   * So the job could be stopped by the Gitea instance if it's timeout is shorter than this.
   */
  public timeout: number;

  /**
   * The timeout for fetching the job from the Gitea instance.
   */
  public fetchTimeout: number = 5 * 1000;

  /**
   * The interval for fetching the job from the Gitea instance.
   */
  public fetchInterval: number = 2 * 1000;

  /**
   * Whether skip verifying the TLS certificate of the Gitea instance.
   */
  public insecure: boolean;

  constructor(daemon: Daemon) {
    this.capacity = daemon.capacity > 0 ? daemon.capacity : 1;
    this.timeout = daemon.timeout > 0 ? daemon.timeout : 3 * 3600 * 1000;
    this.fetchTimeout = daemon.fetchTimeout > 0 ? daemon.fetchTimeout : 5000;
    this.fetchInterval = daemon.fetchInterval > 0 ? daemon.fetchInterval : 2000;
    this.insecure = daemon.insecure ?? false;
  }
}

export default Daemon;
