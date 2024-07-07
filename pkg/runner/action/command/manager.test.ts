import Runner from '@/pkg/runner';

import ActionCommandManager from './manager';

vi.mock('@/pkg/runner');

const runner: Runner = new (Runner as any)();
const commandManager = new ActionCommandManager(runner);

beforeEach(() => {
  runner.context.env = {};
});

describe('action command manager ::set-env:: test', () => {
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
    runner.echoOnActionCommand = true;
    commandManager.process('::set-env name=NODE_OPTIONS,::sobird');

    expect(runner.context.env).toEqual({});
  });
});
