import path from 'node:path';

import Constants from '@/pkg/common/constants';
import Runner from '@/pkg/runner';

import NodeJSAction from './nodejs-action';

vi.mock('@/pkg/runner');

const runner: Runner = new (Runner as any)();

const nodejsAction = new NodeJSAction({
  name: 'Hello World Javascript Action',
  description: 'Greet someone and record the time',
  inputs: {
    'who-to-greet': {
      description: 'Who to greet',
      required: true,
      default: 'World',
    },
  },
  outputs: {
    time: {
      description: 'The time we greeted you',
    },
  },
  runs: {
    using: 'node20',
    pre: 'dist/pre.js',
    main: 'dist/index.js',
    post: 'dist/pre.js',
  },
});

beforeAll(async () => {
  const actionName = 'hello-world-javascript-action';
  const actionDir = path.join(Constants.Directory.Actions, actionName);
  const putExecutor = runner.container?.put(actionDir, path.join('./.github/actions', actionName));
  await putExecutor?.execute();
  nodejsAction.Dir = actionDir;
});

afterAll(async () => {
  const removeExecutor = runner.container?.remove();
  await removeExecutor?.execute();
});

describe('Test NodeJS Action', () => {
  it('run pre', async () => {
    const preExecutor = nodejsAction.pre();
    await preExecutor.execute(runner);
  });
});
