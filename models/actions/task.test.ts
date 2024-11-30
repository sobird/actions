import { sequelize } from '.';

vi.mock('@/lib/sequelize');
vi.mock('./task');

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

it('ddd', async () => {
  console.log('dddd', sequelize.models);

  // const task = await sequelize.models.ActionsTask.create({
  //   id: 47,
  //   jobId: 192,
  //   attempt: 3,
  //   runnerId: 1,
  //   status: 6, // 6 is the status code for "running", running task can upload artifacts
  //   started: new Date(1683636528000),
  //   stopped: new Date(1683636626000),
  //   repositoryId: 4,
  //   ownerId: 1,
  //   commitSha: 'c2d72f548424103f01ee1dc02889c1e2bff816b0',
  //   isForkPullRequest: false,
  //   logFilename: 'artifact-test2/2f/47.log',
  //   logInStorage: true,
  //   logLength: 707,
  //   logSize: 90179,
  //   logExpired: false,
  // });
  // console.log('task', task);
});
