import Constants from '@/pkg/common/constants';
import Runner from '@/pkg/runner';

import ActionCommandManager from './manager';

vi.mock('@/pkg/runner');

const runner: Runner = new (Runner as any)();
const commandManager = new ActionCommandManager(runner);

beforeEach(() => {
  runner.context.env = {};
  runner.masks = [];
  runner.echoOnActionCommand = false;
});

describe('::set-env:: Action Command Manager Test', () => {
  it('ACTIONS_ALLOW_UNSECURE_COMMANDS = false', () => {
    commandManager.process('::set-env name=name,::sobird');

    expect(runner.context.env).toEqual({});
  });

  it('ACTIONS_ALLOW_UNSECURE_COMMANDS', () => {
    process.env.ACTIONS_ALLOW_UNSECURE_COMMANDS = 'true';
    commandManager.process('::set-env name=name, ::sobird');

    expect(runner.context.env).toEqual({ name: 'sobird' });
  });

  it('field name not provided', () => {
    process.env.ACTIONS_ALLOW_UNSECURE_COMMANDS = 'true';
    commandManager.process('::set-env unknown=name,::sobird');

    expect(runner.context.env).toEqual({});
  });

  it('blockList ', () => {
    process.env.ACTIONS_ALLOW_UNSECURE_COMMANDS = 'true';
    runner.echoOnActionCommand = true;
    commandManager.process('::set-env name=NODE_OPTIONS,::sobird');

    expect(runner.context.env).toEqual({});
  });
});

describe('::set-output:: Action Command Manager Test', () => {
  it('set output', () => {
    const { context } = runner;
    commandManager.process('::set-output name=name,::sobird');

    expect(context.steps[context.github.action].outputs.name).toEqual('sobird');
  });
});

describe('::save-state:: Action Command Manager Test', () => {
  it('save state', () => {
    const { context } = runner;
    commandManager.process('::save-state name=name,::sobird');
    expect(runner.IntraActionState[context.github.action].name).toEqual('sobird');
  });
});

describe('::stop-commands:: Action Command Manager Test', () => {
  it('with valid token', () => {
    const { context } = runner;
    const validToken = 'randomToken';
    commandManager.process(`::stop-commands::${validToken}`);
    commandManager.process('::set-env name=name,::sobird1');
    commandManager.process(`::${validToken}::`);

    expect(context.env).toEqual({});
  });

  it('with valid token and new command process', () => {
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

  it('stop Process command fail on invalid stopTokens', () => {
    const invalidStopTokens = ['', 'pause-logging'];

    invalidStopTokens.forEach((stopToken) => {
      expect(() => {
        commandManager.process(`::stop-commands::${stopToken}`);
      }).toThrowError();
    });
  });

  it('stop process command allows invalid stopTokens if Env.Var.IsSet', () => {
    const commandManager2 = new ActionCommandManager(new Runner(undefined as any, {
      context: {
        env: {
          [Constants.Actions.AllowUnsupportedStopCommandTokens]: 'true',
        },
      },
    } as any));

    expect(commandManager2.process('::stop-commands::')).toBe(true);
    expect(commandManager2.process('::stop-commands::pause-logging')).toBe(false);
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

describe('::add-path:: Action Command Manager Test', () => {
  it('add path', () => {
    commandManager.process('::stopToken::');
    commandManager.process('::add-path::path1');
    commandManager.process('::add-path::path2');
    commandManager.process('::add-path::path2');

    expect(runner.prependPath).toEqual(['path2', 'path1']);
  });
});

describe('::add-mask:: Action Command Manager Test', () => {
  it('add-mask', () => {
    commandManager.process('::stopToken::');
    commandManager.process('::add-mask::mask1');
    commandManager.process('::add-mask::mask2');
    commandManager.process('::add-mask::mask3');

    expect(runner.masks).toEqual(['mask1', 'mask2', 'mask3']);
  });

  it('add-mask with multiline value', () => {
    commandManager.process('::add-mask::abc%0Ddef%0Aghi%0D%0Ajkl');
    commandManager.process('::add-mask:: %0D  %0A   %0D%0A    %0D');

    expect(runner.masks).toEqual(['abc', 'def', 'ghi', 'jkl']);
  });
});

describe('::echo:: Action Command Manager Test', () => {
  it('echo process', () => {
    expect(runner.echoOnActionCommand).toBe(false);

    commandManager.process('::echo::on');
    expect(runner.echoOnActionCommand).toBe(true);

    commandManager.process('::echo::off');
    expect(runner.echoOnActionCommand).toBe(false);

    commandManager.process('::echo::ON');
    expect(runner.echoOnActionCommand).toBe(true);

    commandManager.process('::echo::OFF');
    expect(runner.echoOnActionCommand).toBe(false);
  });

  it('echo process command debug on', () => {
    const runner2 = new Runner(undefined as any, {
      context: {
        vars: {
          [Constants.Actions.StepDebug]: 'true',
        },
      },
    } as any);
    const commandManager2 = new ActionCommandManager(runner2);

    expect(runner2.echoOnActionCommand).toBe(true);
    commandManager2.process('::echo::off');
    expect(runner2.echoOnActionCommand).toBe(false);
    commandManager2.process('::echo::on');
    expect(runner2.echoOnActionCommand).toBe(true);
  });

  it('echo invalid value', () => {
    commandManager.process('::echo::invalid');
    expect(runner.echoOnActionCommand).toBe(false);
  });

  it('echo no value', () => {
    commandManager.process('::echo::');
    expect(runner.echoOnActionCommand).toBe(false);
  });
});

describe('::add-matcher:: Action Command Manager Test', () => {
  runner.container?.putContent('ddd', {
    name: 'test',
    body: 'ddd',
  });
  it('add matcher', () => {
    commandManager.process('::add-matcher::package.json');
  });
});
