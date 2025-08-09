const WikiPubsubAdapter = require('../../../../../../business_modules/wiki/infrastructure/messaging/pubsub/wikiPubsubAdapter');

describe('WikiPubsubAdapter', () => {
  test('publishfetchedWikiEvent publishes event', async () => {
    const publishMessage = jest.fn().mockResolvedValue('w1');
    const topicObj = { publishMessage };
    const topic = { get: jest.fn().mockResolvedValue([topicObj]) };
    const pubSubClient = { topic: jest.fn().mockReturnValue(topic) };
    const adapter = new WikiPubsubAdapter({ pubSubClient });
    const id = await adapter.publishfetchedWikiEvent({ repoId: 'owner/repo', pages: [] });
    expect(id).toBe('w1');
    expect(pubSubClient.topic).toHaveBeenCalledWith('wiki');
    const payload = JSON.parse(publishMessage.mock.calls[0][0].data.toString());
    expect(payload.event).toBe('wikiFetched');
    expect(payload.payload.repoId).toBe('owner/repo');
  });
});
