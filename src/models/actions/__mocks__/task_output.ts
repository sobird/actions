import { ActionTaskOutput, type ActionTaskOutputCreationAttributes } from '../task_output';

const seeds: ActionTaskOutputCreationAttributes[] = [
  { id: 1, taskId: 47, outputKey: 'alpha', outputValue: '1' },
  { id: 2, taskId: 47, outputKey: 'beta', outputValue: '2' },
  // task 48 上的 key 与 47 无关：(task_id, output_key) 上的唯一索引是按 task 划范围的
  { id: 3, taskId: 48, outputKey: 'delta', outputValue: '9' },
];

await ActionTaskOutput.sync({ force: true });
await ActionTaskOutput.bulkCreate(seeds, { individualHooks: true, validate: true });

export * from '../task_output';
