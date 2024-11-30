import { sequelize } from '.';

vi.mock('./job');

beforeAll(async () => {
  // const res = await sequelize.models.ActionsRun.findAll();
  // console.log('res', res);
});

it('ddd', async () => {
  console.log('dddd', sequelize.models);
});
