import Workflow from '..';

const workflow = Workflow.Read(`${__dirname}/workflow-single-job.yaml`);

const fn = vi.fn();
(fn as any).Read = vi.fn().mockReturnValue(workflow);

const Mocker = fn.mockImplementation(() => {
  return workflow;
});

export default Mocker;
