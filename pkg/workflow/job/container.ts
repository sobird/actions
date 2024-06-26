/**
 * Container is the specification of the container to use for the job
 *
 * sobird<i@sobird.me> at 2024/05/02 21:41:14 created.
 */

import Expression from '@/pkg/expression';

export interface ContainerProps extends Pick<Container, 'ports' | 'volumes' | 'options'> {
  image?: string;
  credentials?: {
    username?: string;
    password?: string;
  }
  env?: Record<string, string>;
}

/**
 * **Note:** If your workflows use Docker container actions, job containers, or service containers, then you must use a Linux runner:
 *
 * - If you are using GitHub-hosted runners, you must use an Ubuntu runner.
 * - If you are using self-hosted runners, you must use a Linux machine as your runner and Docker must be installed.
 *
 * Use `jobs.<job_id>.container` to create a container to run any steps in a job that don't already specify a container.
 * If you have steps that use both script and container actions,
 * the container actions will run as sibling containers on the same network with the same volume mounts.
 *
 * If you do not set a `container`, all steps will run directly on the host specified by runs-on unless a step refers to an action configured to run in a container.
 *
 * **Note:** The default shell for run steps inside a container is sh instead of bash.
 * This can be overridden with {@link https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_iddefaultsrun `jobs.<job_id>.defaults.run`} or {@link https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idstepsshell `jobs.<job_id>.steps[*].shell`}.
 *
 * When you only specify a container image, you can omit the image keyword.
 */
export default class Container {
  /**
   * Use `jobs.<job_id>.container.image` to define the Docker image to use as the container to run the action.
   * The value can be the Docker Hub image name or a registry name.
   */
  image: Expression<string | undefined>;

  /**
   * If the image's container registry requires authentication to pull the image,
   * you can use `jobs.<job_id>.container.credentials` to set a `map` of the `username` and `password`.
   * The credentials are the same values that you would provide to the {@link https://docs.docker.com/engine/reference/commandline/login/ `docker login`} command.
   */
  credentials?: Expression<{
    username?: string;
    password?: string;
  } | undefined>;

  /**
   * Use `jobs.<job_id>.container.env` to set a `map` of environment variables in the container.
   */
  env?: Expression<Record<string, string> | undefined>;

  /**
   * Use `jobs.<job_id>.container.ports` to set an array of ports to expose on the container.
   */
  ports?: string[];

  /**
   * Use `jobs.<job_id>.container.volumes` to set an `array` of volumes for the container to use.
   * You can use volumes to share data between services or other steps in a job.
   *  You can specify named Docker volumes, anonymous Docker volumes, or bind mounts on the host.
   *
   * To specify a volume, you specify the source and destination path:
   *
   * `<source>:<destinationPath>`.
   *
   * The `<source>` is a volume name or an absolute path on the host machine,
   * and `<destinationPath>` is an absolute path in the container.
   */
  volumes?: string[];

  /**
   * Use jobs.<job_id>.container.options to configure additional Docker container resource options. For a list of options, see "docker create options."
   *
   * Warning: The --network and --entrypoint options are not supported.
   */
  options?: string;

  constructor(container: ContainerProps | string = {}) {
    if (typeof container === 'string') {
      this.image = new Expression(container, ['github', 'needs', 'strategy', 'matrix', 'vars', 'inputs']);
      return;
    }
    this.image = new Expression(container.image, ['github', 'needs', 'strategy', 'matrix', 'vars', 'inputs']);
    this.credentials = new Expression(container.credentials, ['github', 'needs', 'strategy', 'matrix', 'env', 'vars', 'secrets', 'inputs']);
    this.env = new Expression(container.env, ['github', 'needs', 'strategy', 'matrix', 'job', 'runner', 'env', 'vars', 'secrets', 'inputs']);
    this.ports = container.ports;
    this.volumes = container.volumes;
    this.options = container.options;
  }
}
