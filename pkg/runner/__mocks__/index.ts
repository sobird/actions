import Runner from '@/pkg/runner';
// import DockerContainer from '@/pkg/runner/container/docker';
import HostedContainer from '@/pkg/runner/container/hosted';
import Workflow from '@/pkg/workflow';
import Run from '@/pkg/workflow/plan/run';

vi.mock('@/pkg/workflow');
vi.mock('@/pkg/runner/container/docker');
vi.mock('@/pkg/runner/container/hosted');

const workflow = Workflow.Read(`${__dirname}/anything.yaml`);
// todo: Run 是否需要优化？
const run = new Run(Object.keys(workflow.jobs)[0], workflow);

const runner = new Runner(run, {} as any);
runner.container = new HostedContainer({} as any);

const containerExecutor = runner.container.start();

await containerExecutor.execute();

// vi.mock('@/pkg/runner');

// const mockedConstructor = vi.fn();

// Runner.mockImplementation((value) => {
//   return {
//     value: mockedConstructor(value),
//   };
// });

// console.log('Runner123', new Runner());

const mockRunner = vi.fn().mockImplementation(() => {
  return runner;
});

export default mockRunner;
