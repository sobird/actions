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
enum StepType {
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

  if: string;

  _name: string;

  uses: string;

  run: string;

  'working-directory': string;

  shell: string;

  with: {
    args: string;
    entrypoint: string;
  };

  _env: Record<string, string>;

  /**
   * 防止步骤失败时作业也会失败。 设置为 true 以允许在此步骤失败时作业能够通过。
   */
  'continue-on-error': boolean;

  'timeout-minutes': boolean;

  constructor(step: Step) {
    this.id = step.id;
    this.if = step.if;
    this._name = step.name;
    this.uses = step.uses;
    this.run = step.run;
    this['working-directory'] = step['working-directory'];
    this.shell = step.shell;
    this.with = step.with;
    this._env = step.env;
    this['continue-on-error'] = step['continue-on-error'];
    this['timeout-minutes'] = step['timeout-minutes'];
  }

  get name(): string {
    if (this.name !== '') {
      return this.name;
    } if (this.uses !== '') {
      return this.uses;
    } if (this.run !== '') {
      return this.run;
    }
    return this.id;
  }

  set name(name) {
    this._name = name;
  }

  /**
   * 合并with参数到env
   */
  get env() {
    const _env = { ...this._env };

    Object.entries(this.with).forEach(([key, value]) => {
      let envKey = key.toUpperCase().replace(/[^A-Z0-9-]/g, '_');
      envKey = `INPUT_${envKey}`;
      _env[envKey] = value;
    });

    return _env;
  }

  /**
   * returns the command for the shell
   * @returns
   */
  shellCommand() {
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
  type() {
    if (this.run === '' && this.uses === '') {
      return StepType.Invalid;
    }

    if (this.run !== '') {
      if (this.uses !== '') {
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

  toJSON() {
    return {
      id: this.id,
    };
  }
}

export default Step;
