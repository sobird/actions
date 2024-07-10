/**
 * Step is the structure of one step in a job
 *
 * sobird<i@sobird.me> at 2024/05/02 18:29:27 created.
 */

import { UUID, randomUUID } from 'node:crypto';

import Expression from '@/pkg/expression';

/**
 * describes what type of step we are about to run
 */
export enum StepType {
  Run, // 所有具有 'run' 属性的步骤
  UsesDockerURL, // 所有具有形如 'docker://...' 的 'uses' 的步骤
  UsesActionLocal, // 所有具有指向子目录中本地Action的 'uses' 的步骤
  UsesActionRemote, // 所有具有指向GitHub仓库中Action的 'uses' 的步骤
  Invalid, // 所有具有无效步骤动作的步骤
}

export interface StepProps extends Pick<Step, 'id' | 'uses' | 'shell' | 'with'> {
  if: string;
  name: string;
  run: string;
  'working-directory': string;
  with: {
    /**
     * A `string` that defines the inputs for a Docker container.
     * GitHub passes the `args` to the container's `ENTRYPOINT` when the container starts up.
     * An `array of strings` is not supported by this parameter. A single argument that includes spaces should be surrounded by double quotes `""`.
     */
    args: string;
    /**
     * Overrides the Docker `ENTRYPOINT` in the `Dockerfile`, or sets it if one wasn't already specified.
     * Unlike the Docker `ENTRYPOINT` instruction which has a shell and exec form,
     * `entrypoint` keyword accepts only a single string defining the executable to be run.
     *
     * The `entrypoint` keyword is meant to be used with Docker container actions,
     * but you can also use it with JavaScript actions that don't define any inputs.
     */
    entrypoint: string;
    [key: string]: string;
  };
  env: Record<string, string>;
  'continue-on-error': boolean;
  'timeout-minutes': string;
}

class Step {
  #uuid: UUID;

  /**
   * A unique identifier for the step.
   *
   * You can use the id to reference the step in contexts. For more information, see "{@link https://docs.github.com/en/actions/learn-github-actions/contexts Contexts}."
   */
  id: string;

  /**
   * You can use the if conditional to prevent a step from running unless a condition is met.
   *
   * You can use any supported context and expression to create a conditional.
   * For more information on which contexts are supported in this key, see "{@link https://docs.github.com/en/actions/learn-github-actions/contexts#context-availability Contexts}."
   *
   * When you use expressions in an if conditional,
   * you can, optionally, omit the ${{ }} expression syntax because GitHub Actions automatically evaluates the if conditional as an expression.
   * However, this exception does not apply everywhere.
   *
   * You must always use the ${{ }} expression syntax or escape with '', "",
   * or () when the expression starts with !, since ! is reserved notation in YAML format. For example:
   *
   * ```yaml
   * if: ${{ ! startsWith(github.ref, 'refs/tags/') }}
   * ```
   */
  if: Expression<StepProps['if']>;

  /**
   * A name for your step to display on GitHub.
   */
  name: Expression<StepProps['name']>;

  /**
   * Selects an action to run as part of a step in your job. An action is a reusable unit of code.
   * You can use an action defined in the same repository as the workflow, a public repository, or in a {@link https://hub.docker.com/ published Docker container image}.
   *
   * We strongly recommend that you include the version of the action you are using by specifying a Git ref, SHA, or Docker tag.
   * If you don't specify a version, it could break your workflows or cause unexpected behavior when the action owner publishes an update.
   * * Using the commit SHA of a released action version is the safest for stability and security.
   * * If the action publishes major version tags, you should expect to receive critical fixes and security patches while still retaining compatibility. Note that this behavior is at the discretion of the action's author.
   * * Using the default branch of an action may be convenient, but if someone releases a new major version with a breaking change, your workflow could break.
   *
   * Some actions require inputs that you must set using the {@link https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idstepswith with} keyword. Review the action's README file to determine the inputs required.
   *
   * Actions are either JavaScript files or Docker containers. If the action you're using is a Docker container you must run the job in a Linux environment. For more details, see {@link https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idruns-on runs-on}.
   */
  uses: string;

  /**
   * Runs command-line programs that do not exceed 21,000 characters using the operating system's shell.
   * If you do not provide a name, the step name will default to the text specified in the run command.
   *
   * Commands run using non-login shells by default.
   * You can choose a different shell and customize the shell used to run commands.
   * For more information, see {@link https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idstepsshell `jobs.<job_id>.steps[*].shell`}.
   *
   * Each run keyword represents a new process and shell in the runner environment.
   * When you provide multi-line commands, each line runs in the same shell. For example:
   *
   * * A single-line command:
   * ```yaml
   *   - name: Install Dependencies
   *     run: npm install
   * ```
   * * A multi-line command:
   * ```yaml
   *   - name: Clean install dependencies and build
   *     run: |
   *       npm ci
   *       npm run build
   * ```
   */
  run: Expression<StepProps['run']>;

  /**
   * Using the `working-directory` keyword, you can specify the working directory of where to run the command.
   *
   * Alternatively, you can specify a default working directory for all run steps in a job, or for all run steps in the entire workflow.
   * For more information, see "${@link https://docs.github.com/zh/actions/using-workflows/workflow-syntax-for-github-actions#defaultsrunworking-directory `defaults.run.working-directory`}" and "{@link https://docs.github.com/zh/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_iddefaultsrunworking-directory `jobs.<job_id>.defaults.run.working-directory`}."
   */
  'working-directory': Expression<StepProps['working-directory']>;

  /**
   * You can override the default shell settings in the runner's operating system and the job's default using the `shell` keyword.
   * You can use built-in `shell` keywords, or you can define a custom set of shell options.
   * The shell command that is run internally executes a temporary file that contains the commands specified in the `run` keyword.
   */
  shell: string;

  /**
   * A map of the input parameters defined by the action.
   * Each input parameter is a key/value pair.
   * Input parameters are set as environment variables.
   * The variable is prefixed with INPUT_ and converted to upper case.
   *
   * Input parameters defined for a Docker container must use args.
   * For more information, see "{@link https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idstepswithargs `jobs.<job_id>.steps[*].with.args`}."
   */
  with: Expression<StepProps['with']>;

  /**
   * Sets variables for steps to use in the runner environment.
   * You can also set variables for the entire workflow or a job.
   * For more information, see {@link https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#env `env`} and {@link https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idenv `jobs.<job_id>.env`}.
   *
   * When more than one environment variable is defined with the same name, GitHub uses the most specific variable.
   * For example, an environment variable defined in a step will override job and workflow environment variables with the same name, while the step executes.
   * An environment variable defined for a job will override a workflow variable with the same name, while the job executes.
   *
   * Public actions may specify expected variables in the README file.
   * If you are setting a secret or sensitive value, such as a password or token,
   * you must set secrets using the secrets context. For more information, see "{@link https://docs.github.com/en/actions/learn-github-actions/contexts Contexts}."
   */
  env: Expression<StepProps['env']>;

  /**
   * Prevents a job from failing when a step fails. Set to true to allow a job to pass when this step fails.
   */
  'continue-on-error': Expression<StepProps['continue-on-error']>;

  /**
   * The maximum number of minutes to run the step before killing the process.
   */
  'timeout-minutes': Expression<StepProps['timeout-minutes']>;

  #number: number = 0;

  constructor(step: StepProps) {
    this.#uuid = randomUUID();
    this.id = step.id;
    this.if = new Expression(
      step.if,
      ['github', 'needs', 'strategy', 'matrix', 'job', 'runner', 'env', 'vars', 'steps', 'inputs'],
      ['always', 'cancelled', 'success', 'failure', 'hashFiles'],
    );
    this.name = new Expression(
      step.name,
      ['github', 'needs', 'strategy', 'matrix', 'job', 'runner', 'env', 'vars', 'secrets', 'steps', 'inputs'],
      ['hashFiles'],
    );

    this.uses = step.uses;

    this.run = new Expression(
      step.run,
      ['github', 'needs', 'strategy', 'matrix', 'job', 'runner', 'env', 'vars', 'secrets', 'steps', 'inputs'],
      ['hashFiles'],
    );

    this['working-directory'] = new Expression(
      step['working-directory'],
      ['github', 'needs', 'strategy', 'matrix', 'job', 'runner', 'env', 'vars', 'secrets', 'steps', 'inputs'],
      ['hashFiles'],
    );
    this.shell = step.shell;
    this.with = new Expression(
      step.with || {},
      ['github', 'needs', 'strategy', 'matrix', 'job', 'runner', 'env', 'vars', 'secrets', 'steps', 'inputs'],
      ['hashFiles'],
    );
    this.env = new Expression(
      step.env || {},
      ['github', 'needs', 'strategy', 'matrix', 'job', 'runner', 'env', 'vars', 'secrets', 'steps', 'inputs'],
      ['hashFiles'],
    );
    this['continue-on-error'] = new Expression(
      step['continue-on-error'],
      ['github', 'needs', 'strategy', 'matrix', 'job', 'runner', 'env', 'vars', 'secrets', 'steps', 'inputs'],
      ['hashFiles'],
    );
    this['timeout-minutes'] = new Expression(
      step['timeout-minutes'],
      ['github', 'needs', 'strategy', 'matrix', 'job', 'runner', 'env', 'vars', 'secrets', 'steps', 'inputs'],
      ['hashFiles'],
    );
  }

  get uuid() {
    return this.#uuid;
  }

  set number(number: number) {
    this.#number = number;
  }

  get number() {
    return this.#number;
  }

  getName(): string {
    return this.name || this.uses || this.run || this.id;
  }

  // Merge variables from with into env
  getEnv() {
    const env = { ...this.env };

    Object.entries(this.with).forEach(([key, value]) => {
      let envKey = key.toUpperCase().replace(/[^A-Z0-9-]/g, '_');
      envKey = `INPUT_${envKey}`;
      env[envKey] = value;
    });

    return env;
  }

  /**
   * returns the Command run internally for the shell
   */
  getShellCommand() {
    let shellCommand = '';

    switch (this.shell) {
      case '':
      case 'bash':
        shellCommand = 'bash --noprofile --norc -e -o pipefail {0}';
        break;
      case 'pwsh':
        shellCommand = "pwsh -command . '{0}'";
        break;
      case 'python':
        shellCommand = 'python {0}';
        break;
      case 'sh':
        shellCommand = 'sh -e {0}';
        break;
      case 'cmd':
        shellCommand = 'cmd /D /E:ON /V:OFF /S /C "CALL "{0}""';
        break;
      case 'powershell':
        shellCommand = "powershell -command . '{0}'";
        break;
      default:
        shellCommand = this.shell;
    }

    return shellCommand;
  }

  /**
   * returns the type of the step
   */
  get type() {
    if (this.run === '' && this.uses === '') {
      return StepType.Invalid;
    }

    if (this.run) {
      if (this.uses) {
        return StepType.Invalid;
      }
      return StepType.Run;
    } if (this.uses.startsWith('docker://')) {
      return StepType.UsesDockerURL;
    } if (this.uses.startsWith('./')) {
      return StepType.UsesActionLocal;
    }
    return StepType.UsesActionRemote;
  }
}

export default Step;
