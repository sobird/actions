import ActionsRun from './run';

vi.mock('./run');

beforeAll(async () => {
  // await sequelize.sync({ force: true });
});

it('ActionsRun Test', async () => {
  const rows = await ActionsRun.findAll();
  console.log('rows', rows);
});
