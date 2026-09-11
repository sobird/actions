import path from 'node:path';

import { WellKnownDirectory } from '@/common/constants';
import { Result } from '@/gen/runner/v1/messages_pb';
import Runner from '@/runner';

import ActionCommandFile from '.';

vi.mock('@/runner');

const runner: Runner = new (Runner as any)();

const fileCommandDirectory = path.join(WellKnownDirectory.Temp, '_runner_file_commands');
const fileSuffix = 'command-result-test';

beforeEach(() => {
  runner.commandResult = Result.SUCCESS;
});

describe('ActionCommandFile CommandResult Test', () => {
  it('sets FAILURE when a file command fails to process', async () => {
    const actionCommandFile = new ActionCommandFile(runner);
    await actionCommandFile.initialize(fileSuffix);

    // 非法 heredoc 内容：缺少匹配的结束分隔符，getFileEnv 会抛错
    const putContentExecutor = runner.container!.putContent(fileCommandDirectory, {
      name: `set_env_${fileSuffix}`,
      body: 'FOO<<EOF\nbar',
    });
    await putContentExecutor.execute();

    await actionCommandFile.process();

    expect(runner.commandResult).toBe(Result.FAILURE);
  });

  it('keeps SUCCESS when all file commands are empty', async () => {
    const actionCommandFile = new ActionCommandFile(runner);
    await actionCommandFile.initialize(fileSuffix);

    await actionCommandFile.process();

    expect(runner.commandResult).toBe(Result.SUCCESS);
  });
});
