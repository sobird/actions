import os from 'node:os';
import path from 'node:path';
import util from 'node:util';

import shellQuote from 'shell-quote';

import { WellKnownDirectory } from '@/common/constants';
import Executor from '@/common/executor';
import Runner, { WellKnownTags } from '@/runner';

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

      let firstLine = this.script.trimStart(); // 去除前导空白（含 \r\n）
      const firstNewLineIndex = firstLine.search(/[\r\n]/);
      if (firstNewLineIndex !== -1) {
        firstLine = firstLine.substring(0, firstNewLineIndex);
      }

      const groupName = `Run ${firstLine}`;

      runner.output(`${WellKnownTags.Group}${groupName}`);

      const normalized = this.script.replace(/\r\n/g, '\n');
      const lines = normalized.replace(/\n$/, '').split('\n');

      for (const line of lines) {
        runner.output(line);
      }

      runner.output(`shell: ${this.cmd}`);

      if (env.length > 0) {
        runner.output('env:');
        env.forEach(([key, value]) => {
          if (value !== null && value !== '') {
            runner.output(`  ${key}: ${value}`);
          }
        });
      }

      runner.output(WellKnownTags.EndGroup);

      runner.debug(this.command);
    });
  }

  async setupShellCommand(runner: Runner) {
    const { shell, shellPath } = await this.setupShell(runner);
    const script = StepActionScript.FixUpScriptContent(shell, this.run.evaluate(runner));
    const [cmd, ext] = StepActionScript.GetShellCommandAndExt(shell);

    // 上游把 shell 名字和实际执行的可执行文件分开：名字决定参数格式与脚本扩展名，
    // 直接跑在宿主机上时执行的是解析出的绝对路径。cmd 的首个 token 就是 shell 名字。
    this.cmd = shellPath ? `${shellPath}${cmd.slice(shell.length)}` : cmd;
    this.script = script;

    const scriptFilePath = path.join(WellKnownDirectory.Temp, `${this.uuid}${ext}`);
    const resolvedScriptPath = runner.container?.resolve(scriptFilePath);

    this.command = util.format(this.cmd, resolvedScriptPath);

    runner.container
      ?.putContent('.', {
        name: scriptFilePath,
        mode: 0o755,
        body: script,
      })
      .execute();

    return [resolvedScriptPath, script];
  }

  async setupShell(runner: Runner): Promise<{ shell: string; shellPath: string }> {
    let { shell } = this;
    if (!shell) {
      shell = runner.Defaults.run.shell || '';
    }

    await runner.container?.applyPath(runner.prependPath, this.environment);

    // 对齐上游 ScriptHandler 的 validateShellOnHost：只有直接跑在宿主机上
    // （--hosted）才需要在宿主机 PATH 上解析出 shell 的绝对路径，容器内交给
    // 容器自己按名字解析。
    const { container } = runner;
    const onHost = !!container && runner.IsHosted;
    const which = (file: string) => container?.lookPath(file, this.environment, runner.prependPath) || '';

    if (shell) {
      return { shell, shellPath: onHost ? which(shell) : '' };
    }

    if (!onHost) {
      if (runner.ContainerImage) {
        // Currently only linux containers are supported, use sh by default like actions/runner
        return { shell: 'sh', shellPath: '' };
      }
      return { shell: '', shellPath: '' };
    }

    if (container!.OS === 'Windows') {
      // 上游 Windows 默认 pwsh，找不到才整体退回 powershell，名字也跟着变
      const pwsh = which('pwsh');
      if (pwsh) {
        return { shell: 'pwsh', shellPath: pwsh };
      }
      return { shell: 'powershell', shellPath: which('powershell') };
    }

    // 上游非 Windows：名字固定为 sh（参数格式 -e、脚本扩展名 .sh），但执行的是
    // 宿主机上的 bash，找不到 bash 才退回 sh。
    return { shell: 'sh', shellPath: which('bash') || which('sh') };
  }

  WorkingDirectory(runner: Runner) {
    return this['working-directory'].evaluate(runner) || runner.Defaults.run['working-directory'];
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
    return (
      {
        cmd: ['cmd /D /E:ON /V:OFF /S /C "CALL "%s""', '.cmd'],
        pwsh: ['pwsh -command ". \'%s\'"', '.ps1'],
        powershell: ['powershell -command ". \'%s\'"', '.ps1'],
        bash: ['bash --noprofile --norc -e -o pipefail %s', '.sh'],
        sh: ['sh -e %s', '.sh'],
        python: ['python %s', '.py'],
      }[shell || 'bash'] || [shell, '']
    );
  }
}

export default StepActionScript;
