import { sequelize } from '@/lib/sequelize';

import { ActionRunIndex } from './run_index';

vi.mock('@/lib/sequelize');

beforeAll(async () => {
  await ActionRunIndex.sync();
});

describe('ActionRunIndex', () => {
  it('hands out consecutive indexes for one repository, starting at 1', async () => {
    const indexes = await sequelize.transaction(async (transaction) => [
      await ActionRunIndex.getNext(1, transaction),
      await ActionRunIndex.getNext(1, transaction),
      await ActionRunIndex.getNext(1, transaction),
    ]);

    expect(indexes).toEqual([1, 2, 3]);
  });

  it('counts each repository separately', async () => {
    const indexes = await sequelize.transaction(async (transaction) => [
      await ActionRunIndex.getNext(2, transaction),
      await ActionRunIndex.getNext(3, transaction),
      await ActionRunIndex.getNext(2, transaction),
    ]);

    expect(indexes).toEqual([1, 1, 2]);
  });
});
