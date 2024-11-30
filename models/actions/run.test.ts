import ActionsRun from './run';

vi.mock('./run');

it('ActionsRun Test', async () => {
  const rows = await ActionsRun.findAll();
  console.log('rows', rows);
});
