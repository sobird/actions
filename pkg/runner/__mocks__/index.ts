import Runner from '@/pkg/runner';
import Workflow from '@/pkg/workflow';
import Run from '@/pkg/workflow/plan/run';

vi.mock('@/pkg/workflow');

const workflow = Workflow.Read(`${__dirname}/anything.yaml`);
const run = new Run(Object.keys(workflow.jobs)[0], workflow);

const runner = new Runner(run, {});

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
