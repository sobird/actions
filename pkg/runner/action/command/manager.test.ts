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
