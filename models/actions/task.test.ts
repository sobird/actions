import { sequelize } from '.';
import ActionsTask from './task';

vi.mock('./task');

it('ActionsTask Test', async () => {
  console.log('sequelize', sequelize.models);

  const rows = await ActionsTask.findAll();
  console.log('rows', rows);
});
