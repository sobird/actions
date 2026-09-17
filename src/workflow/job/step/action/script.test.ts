import os from 'node:os';
import path from 'node:path';

import { WellKnownDirectory } from '@/common/constants';
import Executor from '@/common/executor';
import Runner from '@/runner';

import type { StepProps } from '..';
import StepActionScript from './script';

vi.mock('@/runner');
vi.mock('@/runner/container/hosted');

/**
 * 只喂 run step 真正会读的那几个字段。`with` 不在其中：它只定义在 uses / reusable workflow 上，
 * 接口里却把 docker 才需要的 args / entrypoint 标成了必填。
 */
function setup({ run, env = {}, ...rest }: Omit<StepProps, 'id'>) {
  const runner: Runner = new (Runner as any)();
  const step = new StepActionScript({ id: '__run', run, env, ...rest });
  runner.stepAction = step;

  const container = runner.container!;

  return {
    runner,
    step,
    container,
    exec: vi.spyOn(container, 'exec').mockImplementation(() => new Executor()),
    putContent: vi.spyOn(container, 'putContent').mockImplementation(() => new Executor()),
  };
}

describe('StepActionScript', () => {
  it('stages the script in the temp directory and runs it through bash', async () => {
    const { runner, step, container, exec, putContent } = setup({ run: 'echo hello world!' });

    await step.main().execute(runner);

    const scriptPath = path.join(WellKnownDirectory.Temp, `${step.uuid}.sh`);

    expect(putContent).toHaveBeenCalledWith('.', {
      name: scriptPath,
      mode: 0o755,
      body: 'echo hello world!',
    });
    // 命令里跑的就是上面上传的那个文件，路径由容器映射
    expect(exec).toHaveBeenCalledWith(
      ['bash', '--noprofile', '--norc', '-e', '-o', 'pipefail', container.resolve(scriptPath)],
      expect.anything(),
    );
  });

  it('passes the step env to the script', async () => {
    const { runner, step, exec } = setup({ run: 'echo $GREETING', env: { GREETING: 'hello world' } });

    await step.main().execute(runner);

    expect(exec).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ env: expect.objectContaining({ GREETING: 'hello world' }) }),
    );
  });

  it('announces the script in a log group before running it', async () => {
    const { runner, step } = setup({ run: '\n  echo one\necho two\n', env: { name: 'script' } });
    const output = vi.spyOn(runner, 'output').mockImplementation(() => {});
    vi.spyOn(runner, 'debug').mockImplementation(() => {});

    await step.main().execute(runner);

    expect(output.mock.calls.map(([line]) => line)).toEqual([
      '##[group]Run echo one',
      // 组名取第一行（去前导空白），正文按原样逐行打印
      '',
      '  echo one',
      'echo two',
      expect.stringContaining('shell: bash --noprofile --norc -e -o pipefail'),
      'env:',
      '  name: script',
      '##[endgroup]',
    ]);
  });

  it('uses the shell the step declares, with the fixup and extension it implies', async () => {
    const { runner, step, container, exec, putContent } = setup({ run: 'Write-Host hi', shell: 'pwsh' });

    await step.main().execute(runner);

    const scriptPath = path.join(WellKnownDirectory.Temp, `${step.uuid}.ps1`);

    expect(putContent).toHaveBeenCalledWith('.', {
      name: scriptPath,
      mode: 0o755,
      body: [
        `$ErrorActionPreference = 'stop'`,
        'Write-Host hi',
        `if ((Test-Path -LiteralPath variable:\\LASTEXITCODE)) { exit $LASTEXITCODE }`,
      ].join(os.EOL),
    });
    expect(exec).toHaveBeenCalledWith(['pwsh', '-command', `. '${container.resolve(scriptPath)}'`], expect.anything());
  });
});
