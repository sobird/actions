import os from 'node:os';
import path from 'node:path';
import { format } from 'node:util';

import shellQuote from 'shell-quote';

import Constants from '@/pkg/common/constants';
import Executor from '@/pkg/common/executor';
import Runner from '@/pkg/runner';

import StepAction from '.';

class StepActionScript extends StepAction {
  public command: string = '';

  private cmd = '';

  private script = '';

  public main() {
    return new Executor(async (ctx) => {
      const runner = ctx!;
      this.applyEnv(runner, this.environment);

      await this.setupShellCommand(runner);

      const cmd = shellQuote.parse(this.command) as string[];
      const cwd = this.WorkingDirectory(runner);

      const container = runner.container!;

      return this.PrintDetails.next(container.exec(cmd, { env: this.environment, cwd }));
    });
  }

  public get PrintDetails() {
    return new Executor((ctx) => {
      const runner = ctx!;
      const stepAction = runner.stepAction!;

      const env = Object.entries(stepAction.env.evaluate(runner) || {});

      const groupName = `Run ${this.script}`;

      runner.output(`##[group]${groupName}`);
      runner.output(this.script);
      runner.output(`shell: ${this.cmd}`);

      if (env.length > 0) {
        runner.output('env:');
        env.forEach(([key, value]) => {
          if (value !== null && value !== '') {
            runner.output(`  ${key}: ${value}`);
          }
        });
      }

      runner.output('##[endgroup]');

      console.log(this.command);
    });
  }

  async setupShellCommand(runner: Runner) {
    const shell = await this.setupShell(runner);
    const script = StepActionScript.FixUpScriptContent(shell, this.run.evaluate(runner));
    const [cmd, ext] = StepActionScript.GetShellCommandAndExt(shell);
    this.cmd = cmd;
    this.script = script;

    const scriptFilePath = path.join(Constants.Directory.Temp, `${this.uuid}${ext}`);
    const resolvedScriptPath = runner.container?.resolve(scriptFilePath);

    this.command = format(cmd, resolvedScriptPath);

    runner.container?.putContent('.', {
      name: scriptFilePath,
      mode: 0o755,
      body: script,
    }).execute();

    return [resolvedScriptPath, script];
  }

  async setupShell(runner: Runner) {
    let { shell } = this;
    if (!shell) {
      shell = runner.Defaults.run.evaluate(runner)?.shell || '';
    }

    await runner.container?.applyPath(runner.prependPath, this.environment);

    if (!shell) {
      //
      if (runner.container && runner.IsHosted) {
        let shellWithFallback = ['bash', 'sh'];
        if (runner.container.OS === 'Windows') {
          shellWithFallback = ['pwsh', 'powershell'];
        }
        [shell] = shellWithFallback;
        const cmd = runner.container.lookPath(shellWithFallback[0], this.environment);
        if (!cmd) {
          [,shell] = shellWithFallback;
        }
      } else if (runner.ContainerImage) {
        // Currently only linux containers are supported, use sh by default like actions/runner
        shell = 'sh';
      }
    }

    return shell;
  }

  WorkingDirectory(runner: Runner) {
    return this['working-directory'].evaluate(runner) || runner.Defaults.run.evaluate(runner)?.['working-directory'];
  }

  static FixUpScriptContent(scriptType: string, content: string) {
    let contents = content;
    switch (scriptType) {
      case 'cmd':
        // Note, use @echo off instead of using the /Q command line switch.
        // When /Q is used, echo can't be turned on.
        contents = `@echo off${os.EOL}${contents}`;
        break;
      case 'powershell':
      case 'pwsh':
        contents = `$ErrorActionPreference = 'stop'${os.EOL}${contents}${os.EOL}if ((Test-Path -LiteralPath variable:\\LASTEXITCODE)) { exit $LASTEXITCODE }`;
        break;
      default:
    }
    return contents;
  }

  static GetShellCommandAndExt(shell: string) {
    return {
      cmd: ['cmd /D /E:ON /V:OFF /S /C "CALL "%s""', '.cmd'],
      pwsh: ["pwsh -command \". '%s'\"", '.ps1'],
      powershell: ["powershell -command \". '%s'\"", '.ps1'],
      bash: ['bash --noprofile --norc -e -o pipefail %s', '.sh'],
      sh: ['sh -e %s', '.sh'],
      python: ['python %s', '.py'],
    }[shell || 'bash'] || [shell, ''];
  }
}

export default StepActionScript;
