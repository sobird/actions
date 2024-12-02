import { CreationAttributes } from 'sequelize';

import ActionsScheduleSpec from '../schedule_spec';

// needs
vi.mock('@/lib/sequelize');

const seeds = [
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
] as CreationAttributes<ActionsScheduleSpec>[];

// ActionsScheduleSpec Setup
await ActionsScheduleSpec.sync({ force: true });
await ActionsScheduleSpec.bulkCreate(seeds, { individualHooks: true, validate: true });

export default ActionsScheduleSpec;
