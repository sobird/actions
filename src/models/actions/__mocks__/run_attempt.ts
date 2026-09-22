import { ActionRunAttempt, type ActionRunAttemptCreationAttributes } from '../run_attempt';
import { Status } from '../status';

// 791/792 是 `__mocks__/run.ts` 里的 run，2001/2002 各挂一个，用来验证关联只取自己那一份。
const seeds: ActionRunAttemptCreationAttributes[] = [
  {
    id: 2001n,
    runId: 791,
    repositoryId: 4,
    attempt: 1,
    triggerUserId: 0,
    concurrencyGroup: '',
    concurrencyCancel: false,
    status: Status.Success,
    startedAt: new Date(1683636528000),
    stoppedAt: new Date(1683636626000),
  },
  {
    id: 2002n,
    runId: 792,
    repositoryId: 4,
    attempt: 1,
    triggerUserId: 0,
    concurrencyGroup: '',
    concurrencyCancel: false,
    status: Status.Waiting,
    startedAt: new Date(1683636528000),
    stoppedAt: new Date(1683636626000),
  },
];

await ActionRunAttempt.sync({ force: true });
await ActionRunAttempt.bulkCreate(seeds, { individualHooks: true, validate: true });

export * from '../run_attempt';
