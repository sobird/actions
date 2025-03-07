import os from 'node:os';
import path from 'node:path';

import Constants from '@/pkg/common/constants';
import Runner from '@/pkg/runner';

import SetEnvFileCommand from './env';

vi.mock('@/pkg/runner');

const runner: Runner = new (Runner as any)();

const rootDirectory = path.join(Constants.Directory.Work, 'SetEnvFileCommand');

beforeEach(() => {
  runner.context.env = {};
});

describe('Set Env File Command Test', () => {
  it('directory not found', async () => {
    const envFile = path.join(rootDirectory, 'directory-not-found', 'env');

    SetEnvFileCommand.process(runner, envFile);
    expect(runner.context.env).toEqual({});
  });

  it('file not found', async () => {
    const envFile = path.join(rootDirectory, 'file-not-found');

    // expect(SetEnvFileCommand.process(runner, envFile)).rejects.toThrowError();
    SetEnvFileCommand.process(runner, envFile);
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
      body: [
        '',
        'MY_ENV=MY VALUE',
        '',
        'MY_ENV_2=my second value',
      ].join(os.EOL),
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
      body: [
        'MY_ENV=MY VALUE',
        'MY_ENV_2=',
        'MY_ENV_3=my third value',
      ].join(os.EOL),
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
      body: [
        'MY_ENV==abc',
        'MY_ENV_2=def=ghi',
        'MY_ENV_3=jkl=',
      ].join(os.EOL),
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
      body: [
        'NODE_OPTIONS<<EOF',
        'asdf',
        'EOF',
      ].join(os.EOL),
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
      body: [
        'MY_ENV<<EOF',
        'line one',
        'line two',
        'line three',
        'EOF',
      ].join(os.EOL),
    });
    putContentExecutor.execute();

    await SetEnvFileCommand.process(runner, filename);

    expect(runner.context.env).toEqual({
      MY_ENV: `line one${os.EOL}line two${os.EOL}line three`,
    });
  });

  it('heredoc Empty Value', async () => {
    const basename = 'heredoc';
    const filename = path.join(rootDirectory, basename);

    const putContentExecutor = runner.container!.putContent(rootDirectory, {
      name: basename,
      body: [
        'MY_OUTPUT<<EOF',
        'EOF',
      ].join(os.EOL),
    });
    putContentExecutor.execute();

    await SetEnvFileCommand.process(runner, filename);

    expect(runner.context.env).toEqual({
      MY_OUTPUT: '',
    });
  });

  it('heredoc Skip Empty Lines', async () => {
    const basename = 'heredoc';
    const filename = path.join(rootDirectory, basename);

    const putContentExecutor = runner.container!.putContent(rootDirectory, {
      name: basename,
      body: [
        'MY_OUTPUT<<EOF',
        'hello',
        'world',
        'EOF',
        '',
        'MY_OUTPUT_2<<EOF',
        'HELLO',
        'AGAIN',
        'EOF',
      ].join(os.EOL),
    });
    putContentExecutor.execute();

    await SetEnvFileCommand.process(runner, filename);

    expect(runner.context.env).toEqual({
      MY_OUTPUT: `hello${os.EOL}world`,
      MY_OUTPUT_2: `HELLO${os.EOL}AGAIN`,
    });
  });

  it('heredoc Special Characters', async () => {
    const basename = 'heredoc';
    const filename = path.join(rootDirectory, basename);

    const putContentExecutor = runner.container!.putContent(rootDirectory, {
      name: basename,
      body: [
        'MY_OUTPUT<<=EOF',
        'hello',
        'one',
        '=EOF',
        'MY_OUTPUT_2<<<EOF',
        'hello',
        'two',
        '<EOF',
        'MY_OUTPUT_3<<EOF',
        'hello',
        '',
        'three',
        '',
        'EOF',
        'MY_OUTPUT_4<<EOF',
        'hello=four',
        'EOF',
        'MY_OUTPUT_5<<EOF',
        ' EOF',
        'EOF',
      ].join(os.EOL),
    });
    putContentExecutor.execute();

    await SetEnvFileCommand.process(runner, filename);

    expect(runner.context.env).toEqual({
      MY_OUTPUT: `hello${os.EOL}one`,
      MY_OUTPUT_2: `hello${os.EOL}two`,
      MY_OUTPUT_3: `hello${os.EOL}${os.EOL}three${os.EOL}`,
      MY_OUTPUT_4: 'hello=four',
      MY_OUTPUT_5: ' EOF',
    });
  });

  it('heredoc Missing NewLine', async () => {
    const basename = 'heredoc';
    const filename = path.join(rootDirectory, basename);

    const putContentExecutor = runner.container!.putContent(rootDirectory, {
      name: basename,
      body: [
        'MY_OUTPUT<<EOF',
        'line one',
        'line two',
        'line three',
        'EOF',
      ].join(' '),
    });
    putContentExecutor.execute();

    expect(SetEnvFileCommand.process(runner, filename)).rejects.toThrow();
  });

  it('heredoc Missing NewLine MultipleLines', async () => {
    const basename = 'heredoc';
    const filename = path.join(rootDirectory, basename);

    const putContentExecutor = runner.container!.putContent(rootDirectory, {
      name: basename,
      body: [
        'MY_OUTPUT<<EOF',
        `line one
        line two
        line three`,
        'EOF',
      ].join(' '),
    });
    putContentExecutor.execute();

    expect(SetEnvFileCommand.process(runner, filename)).rejects.toThrow();
  });

  it('real actions/checkout state', async () => {
    const basename = 'checkout';
    const filename = path.join(rootDirectory, basename);

    const putContentExecutor = runner.container!.putContent(rootDirectory, {
      name: basename,
      body: [
        'isPost<<ghadelimiter_45b205fe-8633-4225-9bca-91f507231615',
        'true',
        'ghadelimiter_45b205fe-8633-4225-9bca-91f507231615',
        'setSafeDirectory<<ghadelimiter_fbb4f3e0-55ca-4079-b720-9c49918de5b1',
        'true',
        'ghadelimiter_fbb4f3e0-55ca-4079-b720-9c49918de5b1',
        'repositoryPath<<ghadelimiter_6ce0c9c1-3735-4ebb-8f38-ac001e84e6ea',
        '/home/runner/work/respository',
        'ghadelimiter_6ce0c9c1-3735-4ebb-8f38-ac001e84e6ea',
      ].join(os.EOL),
    });
    putContentExecutor.execute();

    await SetEnvFileCommand.process(runner, filename);

    expect(runner.context.env).toEqual({
      isPost: 'true',
      repositoryPath: '/home/runner/work/respository',
      setSafeDirectory: 'true',
    });
  });
});
