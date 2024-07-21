import Runner from '@/pkg/runner';

import ActionCommandManager from './manager';

vi.mock('@/pkg/runner');

const runner: Runner = new (Runner as any)();
const commandManager = new ActionCommandManager(runner);

beforeEach(() => {
  runner.context.env = {};
});

describe('action command ::set-env:: test', () => {
  it('set-env (ACTIONS_ALLOW_UNSECURE_COMMANDS = false)', () => {
    commandManager.process('::set-env name=name,::sobird');

    expect(runner.context.env).toEqual({});
  });

  it('set-env (ACTIONS_ALLOW_UNSECURE_COMMANDS = true)', () => {
    process.env.ACTIONS_ALLOW_UNSECURE_COMMANDS = 'true';
    commandManager.process('::set-env name=name,::sobird');

    expect(runner.context.env).toEqual({ name: 'sobird' });
  });

  it('set-env field name not provided', () => {
    process.env.ACTIONS_ALLOW_UNSECURE_COMMANDS = 'true';
    commandManager.process('::set-env unknown=name,::sobird');

    expect(runner.context.env).toEqual({});
  });

  it('set-env BlockList ', () => {
    process.env.ACTIONS_ALLOW_UNSECURE_COMMANDS = 'true';
    runner.EchoOnActionCommand = true;
    commandManager.process('::set-env name=NODE_OPTIONS,::sobird');

    expect(runner.context.env).toEqual({});
  });
});

describe('action command ::set-output:: test', () => {
  it('set-output', () => {
    const { context } = runner;
    commandManager.process('::set-output name=name,::sobird');

    expect(context.steps[context.github.action].outputs.name).toEqual('sobird');
  });
});

describe('action command ::save-state:: test', () => {
  it('save-state', () => {
    const { context } = runner;
    commandManager.process('::save-state name=name,::sobird');
    expect(runner.IntraActionState[context.github.action].name).toEqual('sobird');
  });
});

describe('action command ::stop-commands:: test', () => {
  it('stop-commands with valid token', () => {
    const { context } = runner;
    const validToken = 'randomToken';
    commandManager.process(`::stop-commands::${validToken}`);
    commandManager.process('::set-env name=name,::sobird1');
    commandManager.process(`::${validToken}::`);

    expect(context.env).toEqual({});
  });

  it('stop-commands with valid token and new command process', () => {
    const { context } = runner;
    const validToken = 'randomToken';
    commandManager.process(`::stop-commands::${validToken}`);
    commandManager.process('::set-env name=name,::sobird1');
    commandManager.process(`::${validToken}::`);
    commandManager.process('::set-env name=name,::sobird2');

    expect(context.env).toEqual({
      name: 'sobird2',
    });
  });

  it('stop-commands with invalid token', () => {
    const { context } = runner;
    const invalidToken = 'invalidToken';
    commandManager.process('::stop-commands::stopToken');
    commandManager.process('::set-env name=name,::sobird1');
    commandManager.process(`::${invalidToken}::`);

    expect(context.env).toEqual({});
  });

  it('stop-commands with invalid token and new command process', () => {
    const { context } = runner;
    const invalidToken = 'invalidToken';
    commandManager.process('::stop-commands::stopToken');
    commandManager.process('::set-env name=name,::sobird1');
    commandManager.process(`::${invalidToken}::`);
    commandManager.process('::set-env name=name,::sobird2');
    commandManager.process('::set-env name=hello,::world');

    expect(context.env).toEqual({});
  });
});

describe('action command ::add-path:: test', () => {
  it('add-path', () => {
    commandManager.process('::stopToken::');
    commandManager.process('::add-path::path1');
    commandManager.process('::add-path::path2');
    commandManager.process('::add-path::path2');

    expect(runner.prependPath).toEqual(['path2', 'path1']);
  });
});

describe('action command ::add-mask:: test', () => {
  it('add-mask', () => {
    commandManager.process('::stopToken::');
    commandManager.process('::add-mask::mask1');
    commandManager.process('::add-mask::mask2');
    commandManager.process('::add-mask::mask3');

    expect(runner.masks).toEqual(['mask1', 'mask2', 'mask3']);
  });
});
