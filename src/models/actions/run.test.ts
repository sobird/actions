import { ActionRun } from '@/models/actions';

import Status from './status';

vi.mock('@/lib/sequelize');
vi.mock('./run');
vi.mock('./job');

it('ActionRun Test', async () => {
  const rows = await ActionRun.findAll({
    where: {
      status: Status.Unknown.toString(),
    },
  });
  console.log('rows', rows);
});
