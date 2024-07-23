import path from 'node:path';

import Runner from '@/pkg/runner';

import SetEnvFileCommand from './env';

vi.mock('@/pkg/runner');

const runner: Runner = new (Runner as any)();

const workDirectory = runner.directory('Work');
const rootDirectory = path.join(workDirectory, 'SetEnvFileCommand');

beforeEach(() => {
  runner.context.env = {};
});

describe('set env file command test', () => {
  it('directory not found', async () => {
    const envFile = path.join(rootDirectory, 'directory-not-found', 'env');

    expect(SetEnvFileCommand.process(runner, envFile)).rejects.toThrowError();
    expect(runner.context.env).toEqual({});
  });

  it('file not found', async () => {
    const envFile = path.join(rootDirectory, 'file-not-found');

    expect(SetEnvFileCommand.process(runner, envFile)).rejects.toThrowError();
    expect(runner.context.env).toEqual({});
  });

  it('empty file', async () => {
    const envFile = path.join(rootDirectory, 'empty-file');

    const putContentExecutor = runner.container?.putContent(rootDirectory, {
      name: 'empty-file',
      body: '',
    });
    putContentExecutor?.execute();

    await SetEnvFileCommand.process(runner, envFile);

    expect(runner.context.env).toEqual({});
  });

  it('simple file', async () => {
    const envFile = path.join(rootDirectory, 'simple-file');

    const putContentExecutor = runner.container!.putContent(rootDirectory, {
      name: 'simple-file',
      body: 'MY_ENV=MY VALUE',
    });
    putContentExecutor.execute();

    await SetEnvFileCommand.process(runner, envFile);

    expect(runner.context.env).toEqual({
      MY_ENV: 'MY VALUE',
    });
  });

  it('simple multiLines file', async () => {
    const envFile = path.join(rootDirectory, 'simple-file');

    const putContentExecutor = runner.container!.putContent(rootDirectory, {
      name: 'simple-file',
      body: `

      MY_ENV=MY VALUE

      MY_ENV_2=my second value
      `,
    });
    putContentExecutor.execute();

    await SetEnvFileCommand.process(runner, envFile);

    expect(runner.context.env).toEqual({
      MY_ENV: 'MY VALUE',
      MY_ENV_2: 'my second value',
    });
  });

  it('simple empty value', async () => {
    const envFile = path.join(rootDirectory, 'simple-empty-file');

    const putContentExecutor = runner.container!.putContent(rootDirectory, {
      name: 'simple-empty-file',
      body: 'MY_ENV=',
    });
    putContentExecutor.execute();

    await SetEnvFileCommand.process(runner, envFile);
    expect(runner.context.env).toEqual({
      MY_ENV: '',
    });
  });

  it('simple multiLines with empty value', async () => {
    const envFile = path.join(rootDirectory, 'simple-file');

    const putContentExecutor = runner.container!.putContent(rootDirectory, {
      name: 'simple-file',
      body: `
      MY_ENV=MY VALUE
      MY_ENV_2=
      MY_ENV_3=my third value
      `,
    });
    putContentExecutor.execute();

    await SetEnvFileCommand.process(runner, envFile);

    expect(runner.context.env).toEqual({
      MY_ENV: 'MY VALUE',
      MY_ENV_2: '',
      MY_ENV_3: 'my third value',
    });
  });

  it('simple multiLines with special char', async () => {
    const envFile = path.join(rootDirectory, 'simple-file');

    const putContentExecutor = runner.container!.putContent(rootDirectory, {
      name: 'simple-file',
      body: `
      MY_ENV==abc
      MY_ENV_2=def=ghi
      MY_ENV_3=jkl=
      `,
    });
    putContentExecutor.execute();

    await SetEnvFileCommand.process(runner, envFile);

    expect(runner.context.env).toEqual({
      MY_ENV: '=abc',
      MY_ENV_2: 'def=ghi',
      MY_ENV_3: 'jkl=',
    });
  });

  it('blockList items filtered heredoc', async () => {
    const envFile = path.join(rootDirectory, 'simple-file');

    const putContentExecutor = runner.container!.putContent(rootDirectory, {
      name: 'simple-file',
      body: `
      NODE_OPTIONS<<EOF
      asdf
      EOF
      `,
    });
    putContentExecutor.execute();

    await SetEnvFileCommand.process(runner, envFile);

    expect(runner.context.env).toEqual({});
  });

  it('heredoc', async () => {
    const basename = 'heredoc';
    const filename = path.join(rootDirectory, basename);

    const putContentExecutor = runner.container!.putContent(rootDirectory, {
      name: basename,
      body: `
      MY_ENV<<EOF
      line one
      line two
      line three
      EOF
      `,
    });
    putContentExecutor.execute();

    await SetEnvFileCommand.process(runner, filename);

    expect(runner.context.env).toEqual({});
  });
});
