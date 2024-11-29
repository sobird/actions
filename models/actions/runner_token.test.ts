import { sequelize } from '@/lib/sequelize';

import ActionsRunnerToken from './runner_token';

vi.mock('@/lib/sequelize');

beforeAll(async () => {
  await ActionsRunnerToken.sync({ force: true });
});
