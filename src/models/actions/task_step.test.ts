import { UniqueConstraintError } from 'sequelize';

import { ActionTaskStep, type ActionTaskStepCreationAttributes } from '@/models/actions';

vi.mock('@/lib/sequelize');
vi.mock('./task');
vi.mock('./task_step');

/** 造一个 step 所需的最小字段集；同一个 task 内 index 必须唯一，所以由调用方指定 */
function createStep(overrides: Partial<ActionTaskStepCreationAttributes> = {}) {
  return ActionTaskStep.create({
    name: 'step',
    taskId: 47,
    index: 0,
    repositoryId: 4,
    logIndex: 0,
    logLength: 0,
    status: '6',
    ...overrides,
  });
}

describe('ActionTaskStep', () => {
  it('lists a task steps in index order', async () => {
    const steps = await ActionTaskStep.findAll({ where: { taskId: 47 }, order: [['index', 'ASC']] });

    expect(steps.map((step) => step.name)).toEqual(['run some', 'echo some']);
    expect(steps.map((step) => step.index)).toEqual([2, 3]);
  });

  it('resolves the task a step belongs to', async () => {
    const step = (await ActionTaskStep.findOne({ where: { name: 'run some' } }))!;

    // associate 里写了 as: 'task'，sequelize 生成的就是 getTask
    const task = await step.getTask();

    expect(Number(task.id)).toBe(47);
    expect(task.logFilename).toBe('artifact-test2/2f/47.log');
  });

  it('rejects a second step with the same index in the same task', async () => {
    // (task_id, index) 上的唯一索引就是按顺序摆放 step 的保证
    await expect(createStep({ taskId: 47, index: 2 })).rejects.toThrow(UniqueConstraintError);
  });

  it('allows the same index in a different task', async () => {
    const step = await createStep({ taskId: 48, index: 2 });

    expect(Number(step.taskId)).toBe(48);
    expect(await ActionTaskStep.count({ where: { taskId: 48 } })).toBe(1);
  });
});
