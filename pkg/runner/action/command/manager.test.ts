import Runner from '@/pkg/runner';

import ActionCommandManager from './manager';

vi.mock('@/pkg/runner');

const runner = new Runner(12, {});

const commandManager = new ActionCommandManager(runner);

commandManager.process('::set-env name=hello,::worls');
