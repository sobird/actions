import Workflow from '..';

const workflow = Workflow.Read(`${__dirname}/workflow-single-job.yaml`);

const mockWorkflow = vi.fn().mockImplementation(() => {
  return workflow;
});

(mockWorkflow as any).Read = vi.fn().mockReturnValue(workflow);

export default mockWorkflow;
