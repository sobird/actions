/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable no-underscore-dangle */
/**
 * Step is the structure of one step in a job
 *
 * sobird<i@sobird.me> at 2024/05/02 18:29:27 created.
 */

/**
 * describes what type of step we are about to run
 */
export enum StepType {
  Run, // 所有具有 'run' 属性的步骤
  UsesDockerURL, // 所有具有形如 'docker://...' 的 'uses' 的步骤
  UsesActionLocal, // 所有具有指向子目录中本地Action的 'uses' 的步骤
  UsesActionRemote, // 所有具有指向GitHub仓库中Action的 'uses' 的步骤
  ReusableWorkflowLocal, // 所有具有指向 '.github/workflows' 目录中本地工作流的 'uses' 的步骤
  ReusableWorkflowRemote, // 所有具有指向GitHub仓库中工作流文件的 'uses' 的步骤
  Invalid, // 所有具有无效步骤动作的步骤
}

/**
 * Step is the structure of one step in a job
 */
class Step {
  /**
   * 步骤的唯一标识符。 可以使用 `id` 在上下文中引用该步骤。
   */
  id: string;

  /**
   * 可以使用 `if` 条件来阻止步骤运行，除非满足条件。
   *
   * 您可以使用任何支持上下文和表达式来创建条件。
   * * 支持的上下文：`github`, `needs`, `strategy`, `matrix`, `job`, `runner`, `env`, `vars`, `steps`, `inputs`
   * * 支持的特殊函数：`always`, `cancelled`, `success`, `failure`, `hashFiles`
   * 在 `if` 条件中使用表达式时，可以有选择地忽略 `${{ }}` 表达式语法，因为 GitHub Actions 自动将 if 条件作为表达式求值。
   * 但此例外并非适用于所有情况。必须始终使用 `${{ }}` 表达式语法，或者当表达式以`!`开头时，必须使用 `''`、`""`、`()` 进行转义，因为 `!` 是 YAML 格式的保留表示法。
   * 例如：`if: ${{ ! startsWith(github.ref, 'refs/tags/') }}`
   */
  if: string;

  #name: string;

  /**
   * 选择要作为作业中步骤的一部分运行的操作。
   *
   * 操作是一种可重复使用的代码单位。 可以使用在与工作流、公共存储库或已发布的 Docker 容器映像相同的存储库中定义的操作。
   * 强烈建议指定 Git ref、SHA 或 Docker 标记来包含所用操作的版本。 如果不指定版本，在操作所有者发布更新时可能会中断您的工作流程或造成非预期的行为。
   * * 使用已发行操作版本的 SHA 对于稳定性和安全性是最安全的。
   * * 如果操作发布主版本标记，则应收到关键修补程序和安全修补程序，同时仍保持兼容性。 请注意，此行为由操作创建者决定。
   * * 使用操作的默认分支可能很方便，但如果有人新发布具有突破性更改的主要版本，您的工作流程可能会中断。
   * 某些操作需要必须使用 with 关键字设置的输入。 请查阅操作的自述文件，确定所需的输入。
   *
   * 操作为 JavaScript 文件或 Docker 容器。 如果您使用的操作是 Docker 容器，则必须在 Linux 环境中运行作业。 有关详细信息，请参阅 runs-on。
   */
  uses: string;

  /**
   * 使用操作系统的 `shell` 运行不超过 21,000 个字符的命令行程序。 如果不提供 `name`，步骤名称将默认为 `run` 命令中指定的文本。
   *
   * 命令默认使用非登录 shell 运行。 您可以选择不同的 shell，也可以自定义用于运行命令的 shell。 有关详细信息，请参阅 {@link https://docs.github.com/zh/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idstepsshell `jobs.<job_id>.steps[*].shell`}。
   * 每个 `run` 关键字代表运行器环境中一个新的进程和 shell。 当您提供多行命令时，每行都在同一个 shell 中运行。
   */
  run: string;

  /**
   * 使用 working-directory 关键字，你可以指定运行命令的工作目录位置。
   */
  'working-directory': string;

  /**
   * 你可以使用 `shell` 关键字，覆盖运行器操作系统中的默认 Shell 设置，以及作业的默认值。
   * 你可以使用内置的 `shell` 关键字，也可以自定义 `shell` 选项集。
   * 内部运行的 `shell` 命令执行一个临时文件，其中包含 `run` 关键字中指定的命令。
   */
  shell: string;

  /**
   * 由操作定义的输入参数的 map。 每个输入参数都是一个键/值对。
   * 输入参数被设置为环境变量。 该变量的前缀为 INPUT_，并转换为大写。
   * 为 Docker 容器定义的输入参数必须使用 args
   */
  with: {
    /**
     * string 定义 Docker 容器的输入。 GitHub 在容器启动时将 args 传递到容器的 ENTRYPOINT。
     * 此参数不支持 array of strings。 包含空格的单个参数应该用双引号 "" 括起来。
     */
    args: string;
    /**
     * 如果未指定该项，则替代 `Dockerfile` 中的 Docker `ENTRYPOINT`，否则对其进行设置。
     * 与包含 shell 和 exec 表单的 Docker `ENTRYPOINT` 指令不同，`entrypoint` 关键字只接受定义要运行的可执行文件的单个字符串。
     */
    entrypoint: string;
    [key: string]: string;
  };

  #env: Record<string, string>;

  /**
   * 防止步骤失败时作业也会失败。 设置为 true 以允许在此步骤失败时作业能够通过。
   */
  'continue-on-error': boolean;

  /**
   * 在 GitHub 自动取消运行之前可让作业运行的最大分钟数。 默认值：360
   */
  'timeout-minutes': boolean;

  constructor(step: Step) {
    this.id = step.id;
    this.if = step.if;
    this.#name = step.name;
    this.uses = step.uses;
    this.run = step.run;
    this['working-directory'] = step['working-directory'];
    this.shell = step.shell;
    this.with = step.with;
    this.#env = step.env;
    this['continue-on-error'] = step['continue-on-error'];
    this['timeout-minutes'] = step['timeout-minutes'];
  }

  /**
   * 步骤显示在 GitHub 上的名称。
   */
  get name(): string {
    return this.#name || this.uses || this.run || this.id;
  }

  set name(name) {
    this.#name = name;
  }

  /**
   * 设置供步骤在运行器环境中使用的变量。 也可以设置用于整个工作流或某个作业的变量。
   *
   * 当多个环境变量使用相同的名称定义时，GitHub 会使用最特定的变量。 例如，步骤中定义的环境变量在步骤执行时将覆盖名称相同的作业和工作流环境变量。 为作业定义的环境变量在作业执行时将覆盖名称相同的工作流变量。
   * 公共操作可在自述文件中指定预期的变量。 如果要设置机密或敏感值（如密码或令牌），则必须使用 secrets 上下文来设置机密。
   */
  get env() {
    const env = { ...this.#env };

    Object.entries(this.with).forEach(([key, value]) => {
      let envKey = key.toUpperCase().replace(/[^A-Z0-9-]/g, '_');
      envKey = `INPUT_${envKey}`;
      env[envKey] = value;
    });

    return env;
  }

  /**
   * returns the command for the shell
   * @returns
   */
  get shellCommand() {
    let shellCommand = '';

    switch (this.shell) {
      case '':
      case 'bash':
        shellCommand = 'bash --noprofile --norc -e -o pipefail {0}';
        break;
      case 'pwsh':
        shellCommand = 'pwsh -command . \'{0}\'';
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
        shellCommand = 'powershell -command . \'{0}\'';
        break;
      default:
        shellCommand = this.shell;
    }

    return shellCommand;
  }

  /**
   * returns the type of the step
   *
   * @returns
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
    } if (
      this.uses.startsWith('./.github/workflows')
      && (this.uses.endsWith('.yml') || this.uses.endsWith('.yaml'))
    ) {
      return StepType.ReusableWorkflowLocal;
    } if (
      !this.uses.startsWith('./')
      && this.uses.includes('.github/workflows')
      && (this.uses.includes('.yml@') || this.uses.includes('.yaml@'))
    ) {
      return StepType.ReusableWorkflowRemote;
    } if (this.uses.startsWith('./')) {
      return StepType.UsesActionLocal;
    }
    return StepType.UsesActionRemote;
  }
}

export default Step;
