const GitPubsubAdapter = require('../../../../../../business_modules/git/infrastructure/messaging/pubsub/gitPubsubAdapter');

describe('GitPubsubAdapter', () => {
  function make() {
    const transport = { publish: jest.fn().mockResolvedValue('git-msg') };
    const logger = { error: jest.fn(), info: jest.fn(), debug: jest.fn(), warn: jest.fn() };
    const adapter = new GitPubsubAdapter({ transport, logger });
    return { adapter, transport, logger };
  }

  test('publishRepoFetchedEvent publishes correct payload', async () => {
    const { adapter, transport } = make();
    const id = await adapter.publishRepoFetchedEvent({ repoId: 'owner/r', userId: 'u1' }, 'corr-2');
    expect(id).toBe('git-msg');
    expect(transport.publish).toHaveBeenCalledWith('git-events', expect.objectContaining({
      event: 'repositoryFetched',
      payload: expect.objectContaining({ correlationId: 'corr-2', repoId: 'owner/r', userId: 'u1' })
    }));
  });

  test('publishDocsFetchedEvent publishes correct payload', async () => {
    const { adapter, transport } = make();
    const id = await adapter.publishDocsFetchedEvent({ repoId: 'owner/r', userId: 'u1' }, 'corr-3');
    expect(id).toBe('git-msg');
    expect(transport.publish).toHaveBeenCalledWith('git-events', expect.objectContaining({
      event: 'docsFetched',
      payload: expect.objectContaining({ correlationId: 'corr-3', repoId: 'owner/r', userId: 'u1' })
    }));
  });
});
