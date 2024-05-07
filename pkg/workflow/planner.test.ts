/* eslint-disable @typescript-eslint/naming-convention */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import WorkflowPlanner from './planner';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 全局使用
const workflowPlanner = WorkflowPlanner.Collect(resolve(__dirname, './__mocks__/data/planner'));

describe('workflow planner', () => {
  it('planner collect workflow test case', () => {
    expect(workflowPlanner.workflows.length).toBe(2);
  });

  it('planner plan event push test case', () => {
    const plan = workflowPlanner.planEvent('push');

    expect(plan?.stages.length).toBe(3);
    expect(plan?.maxRunNameLen()).toBe('Explore-Gitea-Actions-Diff'.length);
  });

  it('planner plan event other test case', () => {
    const plan = workflowPlanner.planEvent('other');

    expect(plan?.stages.length).toBe(0);
    expect(plan?.maxRunNameLen()).toBe(0);
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
    const events = workflowPlanner.events();

    expect(events.length).toBe(2);
  });
});
