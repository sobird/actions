import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import Action from '.';

const tmp = path.join(os.tmpdir(), 'action');

beforeEach(() => {
  fs.mkdirSync(tmp, { recursive: true });
});

afterEach(() => {
  console.log('tmp', tmp);
  fs.rmdirSync(tmp, { recursive: true });
});

describe('test action Reader', () => {
  const yaml = `
  name: 'name'
  description: 'description'
  runs:
    using: 'node16'
    main: 'main.js'
  `;

  const cases = [
    {
      name: 'read action yml',
      filename: 'action.yml',
      yaml,
      expected: new Action({
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
      filename: 'action.yaml',
      yaml,
      expected: new Action({
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
      filename: 'Dockerfile',
      yaml: 'FROM ubuntu:20.04',
      expected: new Action({
        name: '(Synthetic)',
        description: 'docker file action',
        runs: {
          using: 'docker',
          image: 'Dockerfile',
        },
      }),
    },
  ];

  for (const [index, item] of cases.entries()) {
    // eslint-disable-next-line @typescript-eslint/no-loop-func
    it(item.name, () => {
      const actionPath = path.join(tmp, String(index));
      fs.mkdirSync(actionPath, { recursive: true });
      fs.writeFileSync(path.join(actionPath, item.filename), item.yaml);

      const action = Action.Scan(actionPath);
      expect(action).toEqual(item.expected);
    });
  }
});
