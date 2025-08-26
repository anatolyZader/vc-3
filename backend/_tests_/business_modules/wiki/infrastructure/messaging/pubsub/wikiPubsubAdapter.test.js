const DocsPubsubAdapter = require('../../../../../../business_modules/docs/infrastructure/messaging/pubsub/docsPubsubAdapter');

describe('DocsPubsubAdapter', () => {
  test('publishfetchedDocsEvent publishes event', async () => {
    const publishMessage = jest.fn().mockResolvedValue('w1');
    const topicObj = { publishMessage };
    const topic = { get: jest.fn().mockResolvedValue([topicObj]) };
    const pubSubClient = { topic: jest.fn().mockReturnValue(topic) };
    const adapter = new DocsPubsubAdapter({ pubSubClient });
    const id = await adapter.publishfetchedDocsEvent({ repoId: 'owner/repo', pages: [] });
    expect(id).toBe('w1');
    expect(pubSubClient.topic).toHaveBeenCalledWith('docs');
    const payload = JSON.parse(publishMessage.mock.calls[0][0].data.toString());
    expect(payload.event).toBe('docsFetched');
    expect(payload.payload.repoId).toBe('owner/repo');
  });
});
