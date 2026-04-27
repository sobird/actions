import path from 'node:path';

import Constants from '@/common/constants';
import Executor from '@/common/executor';
import Runner from '@/runner';
import HostedContainer from '@/runner/container/hosted';

import NodeJSAction from './nodejs';

vi.mock('@/runner');
vi.mock('@/runner/container/hosted');

const runner: Runner = new (Runner as any)();
const hostedContainer: HostedContainer = new (HostedContainer as any)();

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
  const putExecutor = runner.container?.put(actionDir, path.join('./test/actions', actionName));
  await putExecutor?.execute();
  nodejsAction.Dir = actionDir;
});

afterAll(async () => {
  const removeExecutor = runner.container?.remove();
  await removeExecutor?.execute();
});

describe('Test NodeJS Action', () => {
  it('runs pre & pre-if has set', async () => {
    runner.container = hostedContainer;
    const containerExecMock = vi.spyOn(runner.container, 'exec').mockImplementation((command, options) => {
      console.log('command', command);
      console.log('options', options);

      return new Executor();
    });

    const preExecutor = nodejsAction.Pre.if(nodejsAction.HasPre);
    await preExecutor.execute(runner);

    expect(containerExecMock).toHaveBeenCalled();
  });
});
