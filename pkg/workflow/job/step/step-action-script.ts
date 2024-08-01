import Executor from '@/pkg/common/executor';

import StepAction from './step-action';

class StepActionScript extends StepAction {
  public main() {
    return this.executor(new Executor(async (ctx) => {
      const runner = ctx!;
      console.log('step action script main');

      await runner.container?.exec(['node', '-v'], {}).execute();
    }));
  }

  setupShell() {
    return new Executor((ctx) => {
      const runner = ctx!;

      if (!this.shell) {
        this.shell = runner.Defaults.run.evaluate(runner)?.shell;
      }

      if (!this.shell) {
        //
        if (runner.container) {
          let shellWithFallback = ['bash', 'sh'];
          if (runner.container.platform === 'Windows') {
            shellWithFallback = ['pwsh', 'powershell'];
          }
          [this.shell] = shellWithFallback;
          runner.container.applyPath(runner.prependPath);
          const cmd = runner.container.lookPath(shellWithFallback[0]);
          if (!cmd) {
            [,this.shell] = shellWithFallback;
          }
        } else if (runner.ContainerImage) {
          // Currently only linux containers are supported, use sh by default like actions/runner
          this.shell = 'sh';
        }
      }
    });
  }

  /**
   * returns the Command run internally for the shell
   */
  get shellCommand() {
    let { shell } = this;

    switch (shell) {
      case '':
        break;
      case 'bash':
        shell = 'bash --noprofile --norc -e -o pipefail {0}';
        break;
      case 'pwsh':
        shell = "pwsh -command . '{0}'";
        break;
      case 'python':
        shell = 'python {0}';
        break;
      case 'sh':
        shell = 'sh -e {0}';
        break;
      case 'cmd':
        shell = 'cmd /D /E:ON /V:OFF /S /C "CALL "{0}""';
        break;
      case 'powershell':
        shell = "powershell -command . '{0}'";
        break;
      default:
        // shell = this.shell;
    }

    return shell;
  }
}

export default StepActionScript;
