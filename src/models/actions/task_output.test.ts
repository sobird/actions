import { UniqueConstraintError } from 'sequelize';

import { ActionTask, ActionTaskOutput, type ActionTaskOutputCreationAttributes } from '@/models/actions';

vi.mock('@/lib/sequelize');
vi.mock('./task');
vi.mock('./task_output');

/** 造一行 output 所需的最小字段集；同一个 task 内 key 必须唯一，所以由调用方指定 */
function createOutput(overrides: Partial<ActionTaskOutputCreationAttributes> = {}) {
  return ActionTaskOutput.create({
    taskId: 47,
    outputKey: 'gamma',
    outputValue: '3',
    ...overrides,
  });
}

describe('ActionTaskOutput', () => {
  it('returns the keys of one task only', async () => {
    const keys = await ActionTaskOutput.findKeysByTaskId(47);

    // 48 上那行在这里不该出现，说明查询是按 taskId 收口的
    expect(keys.toSorted()).toEqual(['alpha', 'beta']);
  });

  it('resolves the task an output belongs to', async () => {
    const output = (await ActionTaskOutput.findOne({ where: { taskId: 47, outputKey: 'alpha' } }))!;

    // associate 里写了 as: 'task'，sequelize 生成的就是 getTask
    const task = await output.getTask();

    expect(task.id).toBe(47);
    expect(task.logFilename).toBe('artifact-test2/2f/47.log');
  });

  it('lists the outputs of one task', async () => {
    const task = await ActionTask.findByPk(47);

    // associate 里写了 as: 'outputs'，sequelize 生成的就是 getOutputs
    const outputs = await task!.getOutputs({ order: [['outputKey', 'ASC']] });

    expect(outputs.map((output) => output.outputKey)).toEqual(['alpha', 'beta']);
  });

  it('inserts an output the task does not have yet', async () => {
    await ActionTaskOutput.insertIfNotExist(47, 'gamma', '3');

    const output = await ActionTaskOutput.findOne({ where: { taskId: 47, outputKey: 'gamma' } });
    expect(output?.outputValue).toBe('3');
  });

  it('keeps the value the task already reported', async () => {
    // runner 会重发没被 ack 的 outputs，重发不该改动已经落库的值
    await ActionTaskOutput.insertIfNotExist(47, 'alpha', 'changed');

    const output = (await ActionTaskOutput.findOne({ where: { taskId: 47, outputKey: 'alpha' } }))!;
    expect(output.outputValue).toBe('1');
    await expect(ActionTaskOutput.count({ where: { taskId: 47, outputKey: 'alpha' } })).resolves.toBe(1);
  });

  it('rejects a second output with the same key in the same task', async () => {
    // (task_id, output_key) 上的唯一索引就是「首次写入胜出」的保证
    await expect(createOutput({ taskId: 47, outputKey: 'alpha' })).rejects.toThrow(UniqueConstraintError);
  });

  it('allows the same key in a different task', async () => {
    const output = await createOutput({ taskId: 48, outputKey: 'alpha' });

    expect(output.taskId).toBe(48);
    expect(await ActionTaskOutput.count({ where: { taskId: 48, outputKey: 'alpha' } })).toBe(1);
  });
});
