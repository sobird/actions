import { ActionRunnerToken } from './runner_token';

vi.mock('./runner_token');

describe('Test Actions Runner Token Model', () => {
  it('ActionRunnerToken.findLatestOne', async () => {
    const actionsActionRunnerToken = await ActionRunnerToken.create({
      ownerId: 0,
      repositoryId: 1,
    });
    const expected = await ActionRunnerToken.findLatestOne(1, 1);

    expect(expected.toJSON()).toEqual(actionsActionRunnerToken.toJSON());
  });

  it('ActionRunnerToken.createForScope', async () => {
    const actionsActionRunnerToken = await ActionRunnerToken.rotate(1, 0);
    const expected = await ActionRunnerToken.findLatestOne(1, 0);

    expect(expected.toJSON()).toEqual(actionsActionRunnerToken.toJSON());
  });

  it('ActionRunnerToken.update', async () => {
    const actionsActionRunnerToken = await ActionRunnerToken.rotate(1, 0);
    actionsActionRunnerToken.enabled = false;
    await actionsActionRunnerToken.save();

    await expect(ActionRunnerToken.findLatestOne(1, 0)).rejects.toThrow();
  });
});
