import path from 'node:path';

import { loadRegistration } from '@/config/index.ts';
import Labels from '@/labels/index.ts';
import Runner from '@/runner';
// import DockerContainer from '@/runner/container/docker';
import HostedContainer from '@/runner/container/hosted';
import Workflow from '@/workflow';
import Run from '@/workflow/plan/run';

vi.mock('@/workflow');
// vi.mock('@/runner/container/docker');
vi.mock('@/runner/container/hosted');

const workflow = Workflow.Read(`${__dirname}/anything.yaml`);
// todo: Run 是否需要优化？
const run = new Run(Object.keys(workflow.jobs)[0], workflow);

const registration = loadRegistration();
const labels = new Labels(registration.labels);

// const config = getConfig();
// use hosted container test
// (config as any).platformPicker = () => {
//   return '-self-hosted';
// };

const container = new HostedContainer({} as any);
await container.start().execute();

const Mocked = vi.fn(function (unknown, conf = {}) {
  // todo reset config
  const runner = new Runner(run, {
    context: {},
    workdir: path.resolve('.'),
    platforms: labels.platforms,
    ...conf,
  });

  // default container for test
  runner.container = container;

  // current step setup
  runner.context.github.action = '__run';
  runner.context.steps[runner.context.github.action] = {
    outputs: {},
    outcome: 'success',
    conclusion: 'success',
  };
  runner.IntraActionState[runner.context.github.action] = {};

  return runner;
});

export default Mocked;
