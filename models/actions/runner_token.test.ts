import ActionsRunnerToken from './runner_token';

vi.mock('./runner_token');

describe('Test Actions Runner Token Model', () => {
  it('ActionsRunnerToken.findLatestByScope', async () => {
    const actionsRunnerToken = await ActionsRunnerToken.create({
      ownerId: 1,
      repositoryId: 1,
    });
    const expected = await ActionsRunnerToken.findLatestByScope(1, 1);

    expect(expected.toJSON()).toEqual(actionsRunnerToken.toJSON());
  });

  it('ActionsRunnerToken.createForScope', async () => {
    const actionsRunnerToken = await ActionsRunnerToken.createForScope(1, 0);
    const expected = await ActionsRunnerToken.findLatestByScope(1, 0);

    expect(expected.toJSON()).toEqual(actionsRunnerToken.toJSON());
  });

  it('ActionsRunnerToken.update', async () => {
    const actionsRunnerToken = await ActionsRunnerToken.createForScope(1, 0);
    actionsRunnerToken.enabled = false;
    await actionsRunnerToken.save();

    const expected = await ActionsRunnerToken.findLatestByScope(1, 0);

    expect(expected.toJSON()).toEqual(actionsRunnerToken.toJSON());
  });
});
