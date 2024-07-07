import Runner from '@/pkg/runner';

import ActionCommandManager from './manager';

vi.mock('@/pkg/runner');

const runner: Runner = new (Runner as any)();
const commandManager = new ActionCommandManager(runner);

process.env.ACTIONS_ALLOW_UNSECURE_COMMANDS = 'true';

commandManager.process('::set-env name=name,::sobird');

console.log('runner', runner.context.env);

describe('d', () => {
  //
});
