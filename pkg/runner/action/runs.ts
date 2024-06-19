class Runs {
  /**
   * Required The runtime used to execute the code specified in main.
   */
  using: string;

  /**
   * Required The file that contains your action code.
   * The runtime specified in using executes this file.
   */
  main?: string;

  /**
   * Optional Allows you to run a script at the start of a job, before the main: action begins.
   * For example, you can use pre: to run a prerequisite setup script.
   * The runtime specified with the using syntax will execute this file.
   * The pre: action always runs by default but you can override this using runs.pre-if.
   *
   * In this example, the pre: action runs a script called setup.js:
   * ```yaml
   * runs:
   *   using: 'node20'
   *   pre: 'setup.js'
   *   main: 'index.js'
   *   post: 'cleanup.js'
   * ```
   */
  pre?: string;

  /**
   * Optional Allows you to define conditions for the pre: action execution.
   * The pre: action will only run if the conditions in pre-if are met.
   * If not set, then pre-if defaults to always().
   * In pre-if, status check functions evaluate against the job's status, not the action's own status.
   *
   * Note that the step context is unavailable, as no steps have run yet.
   *
   * In this example, cleanup.js only runs on Linux-based runners:
   * ```yaml
   *   pre: 'cleanup.js'
   *   pre-if: runner.os == 'linux'
   * ```
   */
  'pre-if'?: () => boolean;

  /**
   * Optional Allows you to run a script at the end of a job, once the main: action has completed.
   * For example, you can use post: to terminate certain processes or remove unneeded files.
   * The runtime specified with the using syntax will execute this file.
   *
   * In this example, the post: action runs a script called cleanup.js:
   * ```yaml
   * runs:
   *   using: 'node20'
   *   main: 'index.js'
   *   post: 'cleanup.js'
   * ```
   */
  post?: string;

  /**
   * Optional Allows you to define conditions for the post: action execution.
   * The post: action will only run if the conditions in post-if are met.
   * If not set, then post-if defaults to always(). In post-if, status check functions evaluate against the job's status, not the action's own status.
   *
   * For example, this cleanup.js will only run on Linux-based runners:
   * ```yaml
   *   post: 'cleanup.js'
   *   post-if: runner.os == 'linux'
   * ```
   */
  'post-if'?: () => boolean;

  /**
   * Required The Docker image to use as the container to run the action.
   * The value can be the Docker base image name, a local Dockerfile in your repository, or a public image in Docker Hub or another registry.
   * To reference a Dockerfile local to your repository, the file must be named Dockerfile and you must use a path relative to your action metadata file.
   * The docker application will execute this file.
   */
  image?: string;

  /**
   * Optional Specifies a key/value map of environment variables to set in the container environment.
   */
  env?: Record<string, string>;

  'pre-entrypoint'?: string;

  entrypoint?: string;

  'post-entrypoint'?: string;

  constructor(runs: Runs) {
    this.using = runs.using;
    this.main = runs.main;
    this.pre = runs.pre;
    this['pre-if'] = runs['pre-if'];
    this.post = runs.post;
    this['post-if'] = runs['post-if'];
    this.image = runs.image;
    this.env = runs.env;
    this['pre-entrypoint'] = runs['pre-entrypoint'];
    this.entrypoint = runs.entrypoint;
    this['post-entrypoint'] = runs['post-entrypoint'];
  }
}

export default Runs;
