import { ActionScheduleSpec, type ActionScheduleSpecCreationAttributes } from '../schedule_spec';

// needs
vi.mock('@/lib/sequelize');

const seeds: ActionScheduleSpecCreationAttributes[] = [
  {
    scheduleId: BigInt(1),
    repositoryId: BigInt(4),
    spec: '30 5 * * 1,3',
    next: new Date(),
    prev: new Date(),
  },
  {
    scheduleId: BigInt(1),
    repositoryId: BigInt(4),
    spec: '30 5 * * 2,4',
    next: new Date(),
    prev: new Date(),
  },
];

// ActionScheduleSpec Setup
await ActionScheduleSpec.sync({ force: true });
await ActionScheduleSpec.bulkCreate(seeds, { individualHooks: true, validate: true });

export default ActionScheduleSpec;
