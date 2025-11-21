const GitPubsubAdapter = require('../../../../../../business_modules/git/infrastructure/messaging/pubsub/gitPubsubAdapter');

describe('GitPubsubAdapter', () => {
  function make() {
    const publishMessage = jest.fn().mockResolvedValue('git-msg');
    const topic = { publishMessage };
    const pubSubClient = { topic: jest.fn().mockReturnValue(topic) };
    const adapter = new GitPubsubAdapter({ pubSubClient });
    return { adapter, publishMessage, pubSubClient };
  }

  test('publishRepoFetchedEvent publishes correct payload', async () => {
    const { adapter, publishMessage, pubSubClient } = make();
    const id = await adapter.publishRepoFetchedEvent({ repoId: 'owner/r', userId: 'u1' }, 'corr-2');
    expect(id).toBe('git-msg');
    expect(pubSubClient.topic).toHaveBeenCalled();
    const payload = JSON.parse(publishMessage.mock.calls[0][0].data.toString());
    expect(payload.event).toBe('repositoryFetched');
    expect(payload.correlationId).toBe('corr-2');
    expect(payload.repoId).toBe('owner/r');
  });

  test('publishDocsFetchedEvent publishes correct payload', async () => {
    const { adapter, publishMessage } = make();
    await adapter.publishDocsFetchedEvent({ repoId: 'owner/r', userId: 'u1' }, 'corr-3');
    const payload = JSON.parse(publishMessage.mock.calls[0][0].data.toString());
    expect(payload.event).toBe('docsFetched');
    expect(payload.correlationId).toBe('corr-3');
  });
});
