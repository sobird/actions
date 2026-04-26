import { ActionsRun } from '@/models/actions';

import Status from './status';

vi.mock('@/lib/sequelize');
vi.mock('./run');
vi.mock('./job');

it('ActionsRun Test', async () => {
  const rows = await ActionsRun.findAll({
    where: {
      status: Status.Unknown.toString(),
    },
  });
  console.log('rows', rows);
});
