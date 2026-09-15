import { sequelize } from '@/lib/sequelize';

import { ActionRunAttemptJobIdIndex } from './run_attempt_job_id_index';

vi.mock('@/lib/sequelize');

beforeAll(async () => {
  await ActionRunAttemptJobIdIndex.sync();
});

describe('ActionRunAttemptJobIdIndex', () => {
  it('counts each run separately', async () => {
    const indexes = await sequelize.transaction(async (transaction) => [
      await ActionRunAttemptJobIdIndex.getNext(1, transaction),
      await ActionRunAttemptJobIdIndex.getNext(1, transaction),
      await ActionRunAttemptJobIdIndex.getNext(2, transaction),
    ]);

    expect(indexes).toEqual([1, 2, 1]);
  });
});
