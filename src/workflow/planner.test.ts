import { resolve } from 'node:path';

import WorkflowPlanner from './planner';

// 全局使用
const workflowPlanner = await WorkflowPlanner.Collect(resolve(__dirname, './__mocks__/data/planner'));

describe('workflow planner', () => {
  it('planner collect workflow test case', () => {
    expect(workflowPlanner.workflows.length).toBe(2);
  });

  it('planner plan event push test case', async () => {
    const plan = await workflowPlanner.planEvent('push');

    expect(plan?.stages.length).toBe(3);
  });

  it('planner plan event other test case', async () => {
    const plan = await workflowPlanner.planEvent('other');

    expect(plan?.stages.length).toBe(0);
  });

  it('planner plan job with needs test case', () => {
    const plan = workflowPlanner.planJob('Test-Docker');

    expect(plan?.stages.length).toBe(3);
    expect(plan.stages[2].jobIds).toEqual(['Test-Docker']);
  });

  it('planner plan job with no needs test case', () => {
    const plan = workflowPlanner.planJob('Test-Node');

    expect(plan?.stages.length).toBe(1);
    expect(plan.stages[0].jobIds).toEqual(['Test-Node', 'Test-Node']);
  });

  it('planner plan job other test case', () => {
    const plan = workflowPlanner.planJob('other');

    expect(plan?.stages.length).toBe(0);
  });

  it('planner plan all test case', () => {
    const plan = workflowPlanner.planAll();

    expect(plan?.stages.length).toBe(3);
  });

  it('planner events test case', () => {
    const { events } = workflowPlanner;

    expect(events.length).toBe(2);
  });
});
