const ApiPubsubAdapter = require('../../../../../../business_modules/api/infrastructure/messaging/pubsub/apiPubsubAdapter');

describe('ApiPubsubAdapter', () => {
  test('publishes httpApiFetched event', async () => {
    const publishMessage = jest.fn().mockResolvedValue('msg-1');
    const topic = { publishMessage, get: jest.fn() };
    const topicGetter = jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue([ { publishMessage } ]) });
    const pubSubClient = { topic: topicGetter };
    const adapter = new ApiPubsubAdapter({ pubSubClient });
    const messageId = await adapter.publishHttpApiFetchedEvent({ spec: { paths: {} } }, 'corr-1');
    expect(messageId).toBe('msg-1');
    expect(topicGetter).toHaveBeenCalledWith('git');
    expect(publishMessage).toHaveBeenCalled();
    const payload = JSON.parse(publishMessage.mock.calls[0][0].data.toString());
    expect(payload.event).toBe('httpApiFetched');
    expect(payload.payload.correlationId).toBe('corr-1');
  });
});
