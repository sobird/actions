/**
 * Step is the structure of one step in a job
 *
 * sobird<i@sobird.me> at 2024/05/02 18:29:27 created.
 */

/** StepType describes what type of step we are about to run */
enum StepType {
  Run, // 所有具有 'run' 属性的步骤
  UsesDockerURL, // 所有具有形如 'docker://...' 的 'uses' 的步骤
  UsesActionLocal, // 所有具有指向子目录中本地Action的 'uses' 的步骤
  UsesActionRemote, // 所有具有指向GitHub仓库中Action的 'uses' 的步骤
  ReusableWorkflowLocal, // 所有具有指向 '.github/workflows' 目录中本地工作流的 'uses' 的步骤
  ReusableWorkflowRemote, // 所有具有指向GitHub仓库中工作流文件的 'uses' 的步骤
  Invalid, // 所有具有无效步骤动作的步骤
}

class Step {
  number: number;

  id: string;

  if: any;

  name: string;

  uses: string;

  run: string;

  workingDirectory: string;

  shell: string;

  env: any;

  with: { [key: string]: string };

  rawContinueOnError: string;

  timeoutMinutes: string;

  constructor() {
    this.number = 0;
    this.id = '';
    this.name = '';
    this.uses = '';
    this.run = '';
    this.workingDirectory = '';
    this.shell = '';
    this.with = {};
  }

  // String gets the name of step
  toString() {
    if (this.name !== '') {
      return this.name;
    } if (this.uses !== '') {
      return this.uses;
    } if (this.run !== '') {
      return this.run;
    }
    return this.id;
  }

  environment() {
    return this.env;
  }

  getEnv() {
    const env = this.environment() || {};

    Object.entries(this.with).forEach(([key, value]) => {
      let envKey = key.toUpperCase().replace(/[^A-Z0-9-]/g, '_');
      envKey = `INPUT_${envKey}`;
      env[envKey] = value;
    });

    return env;
  }

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
}

export default Step;
