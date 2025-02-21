import fs from 'node:fs';
import path from 'node:path';

import Executor from '@/pkg/common/executor';
import Runner from '@/pkg/runner';
import DockerContainer from '@/pkg/runner/container/docker';
import { createEachDir } from '@/utils/test';

import ActionFactory from '.';

vi.mock('@/pkg/runner');
vi.mock('@/pkg/runner/container/docker');

const testDir = createEachDir('action');

const runner: Runner = new (Runner as any)();
const dockerContainer: DockerContainer = new (DockerContainer as any)();

describe('Test Action Reader', async () => {
  const yaml = `
  name: 'name'
  description: 'description'
  runs:
    using: 'node16'
    main: 'main.js'
  `;

  const step = new Step({} as StepProps);

  const cases = [
    {
      name: 'read action yml',
      step,
      filename: 'action.yml',
      yaml,
      want: new Action({
        name: 'name',
        description: 'description',
        runs: {
          using: 'node16',
          main: 'main.js',
        },
      }),
    },

    {
      name: 'read action yaml',
      step,
      filename: 'action.yaml',
      yaml,
      want: new Action({
        name: 'name',
        description: 'description',
        runs: {
          using: 'node16',
          main: 'main.js',
        },
      }),
    },

    {
      name: 'read docker file',
      step,
      filename: 'Dockerfile',
      yaml: 'FROM ubuntu:20.04',
      want: new Action({
        name: '(Synthetic)',
        description: 'docker file action',
        runs: {
          using: 'docker',
          image: 'Dockerfile',
        },
      }),
    },
    // {
    //   name: 'read with args',
    //   step: new Step({
    //     with: {
    //       args: 'cmd',
    //     },
    //   } as StepProps),
    //   want: new Action({
    //     name: '(Synthetic)',
    //     description: 'with args action',
    //     inputs: {
    //       cwd: {
    //         description: '(Actual working directory)',
    //         required: false,
    //         default: 'actionDir/actionPath',
    //       },
    //       command: {
    //         description: '(Actual program)',
    //         required: false,
    //         default: 'cmd',
    //       },
    //     },
    //     runs: {
    //       using: 'node12',
    //       image: 'trampoline.js',
    //     },
    //   }),
    // },
  ];

  for await (const [index, item] of cases.entries()) {
    // eslint-disable-next-line @typescript-eslint/no-loop-func
    it(item.name, async () => {
      const actionDir = path.join(testDir, String(index));
      if (item.filename) {
        const actionFile = path.join(actionDir, item.filename);
        fs.mkdirSync(actionDir, { recursive: true });
        fs.writeFileSync(actionFile, item.yaml);
      }

      const scanAction = await Action.Scan(actionDir);
      const pickAction = await Action.Pick((filename) => {
        if (filename !== item.filename) {
          return false;
        }
        return item.yaml;
      });

      expect(scanAction).toEqual(item.want);
      expect(pickAction).toEqual(item.want);
    });
  }
});

describe('Test Action Runner', () => {
  it('with input', () => {
    const step = new StepActionRemote({
      uses: 'org/repo/path@ref',
    } as StepProps);
    const action = new Action({
      name: 'test',
      description: 'test',
      inputs: {
        key: {
          default: 'default value',
          description: '',
        },
      },
      runs: {
        using: 'node16',
      },
    });
    const expectedEnv = { INPUT_KEY: 'default value' };

    // some setting
    runner.container = dockerContainer;
    const containerPutMock = vi.spyOn(runner.container, 'put').mockImplementation((dest) => {
      console.log('dest', dest);
      return new Executor();
    });

    const containerExecMock = vi.spyOn(runner.container, 'exec').mockImplementation((command, inputs) => {
      console.log('command', command);
      console.log('inputs', inputs);

      return new Executor();
    });

    dockerContainer.put('dest1', 'source');

    // run action
    action.executor(step).execute(runner);

    expect(containerPutMock).toHaveBeenCalled();
    expect(containerExecMock).toHaveBeenCalled();
  });
});
