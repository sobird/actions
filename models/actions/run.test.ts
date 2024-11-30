import ActionsRun from './run';

vi.mock('./run');

beforeAll(async () => {
  // await sequelize.sync({ force: true });
});

it('ddd', async () => {
  const res = await ActionsRun.findAll();
  console.log('dddd', res);
});
