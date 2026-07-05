import ActionActionRunnerToken from './runner_token';

vi.mock('./runner_token');

describe('Test Actions Runner Token Model', () => {
  it('ActionActionRunnerToken.findLatestByScope', async () => {
    const actionsActionRunnerToken = await ActionActionRunnerToken.create({
      ownerId: 1,
      repositoryId: 1,
    });
    const expected = await ActionActionRunnerToken.findLatestByScope(1, 1);

    expect(expected.toJSON()).toEqual(actionsActionRunnerToken.toJSON());
  });

  it('ActionActionRunnerToken.createForScope', async () => {
    const actionsActionRunnerToken = await ActionActionRunnerToken.createForScope(1, 0);
    const expected = await ActionActionRunnerToken.findLatestByScope(1, 0);

    expect(expected.toJSON()).toEqual(actionsActionRunnerToken.toJSON());
  });

  it('ActionActionRunnerToken.update', async () => {
    const actionsActionRunnerToken = await ActionActionRunnerToken.createForScope(1, 0);
    actionsActionRunnerToken.enabled = false;
    await actionsActionRunnerToken.save();

    const expected = await ActionActionRunnerToken.findLatestByScope(1, 0);

    expect(expected.toJSON()).toEqual(actionsActionRunnerToken.toJSON());
  });
});
