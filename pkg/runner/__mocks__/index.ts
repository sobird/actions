import Config from '@/pkg/config';
import Runner from '@/pkg/runner';
// import DockerContainer from '@/pkg/runner/container/docker';
import HostedContainer from '@/pkg/runner/container/hosted';
import Workflow from '@/pkg/workflow';
import Run from '@/pkg/workflow/plan/run';

vi.mock('@/pkg/workflow');
// vi.mock('@/pkg/runner/container/docker');
// vi.mock('@/pkg/runner/container/hosted');

const workflow = Workflow.Read(`${__dirname}/anything.yaml`);
// todo: Run 是否需要优化？
const run = new Run(Object.keys(workflow.jobs)[0], workflow);

const config = await Config.Load().runner.configure();
// (config as any).platformPicker = () => { return '-self-hosted'; };

const runner = new Runner(run, config);
// const container = new HostedContainer({} as any);

// start container
// await container.start().execute();

// vi.mock('@/pkg/runner');

// const mockedConstructor = vi.fn();

// Runner.mockImplementation((value) => {
//   return {
//     value: mockedConstructor(value),
//   };
// });

// console.log('Runner123', new Runner());

const mockRunner = vi.fn().mockImplementation((unknown, conf = {}) => {
  Object.assign(runner.config, conf);

  // current step setup
  runner.context.github.action = '__run';
  runner.context.steps[runner.context.github.action] = {
    outputs: {},
    outcome: 'success',
    conclusion: 'success',
  };
  runner.IntraActionState[runner.context.github.action] = {};

  // runner.container = container;

  return runner;
});

export default mockRunner;
