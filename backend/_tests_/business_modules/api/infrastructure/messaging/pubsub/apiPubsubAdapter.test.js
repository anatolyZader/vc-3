const ApiPubsubAdapter = require('../../../../../../business_modules/api/infrastructure/messaging/pubsub/apiPubsubAdapter');

describe('ApiPubsubAdapter', () => {
  test('publishHttpApiFetchedEvent publishes to topic and validates schema', async () => {
    const transport = { publish: jest.fn().mockResolvedValue('m-1') };
    const logger = { error: jest.fn(), info: jest.fn(), debug: jest.fn(), warn: jest.fn() };
    const adapter = new ApiPubsubAdapter({ transport, logger });

    const result = { openapi: "3.0.0", info: { title: "x" } };
    const correlationId = "c1";
    await adapter.publishHttpApiFetchedEvent(result, correlationId);

    expect(transport.publish).toHaveBeenCalledWith('api-events', expect.objectContaining({
      event: 'httpApiFetched',
      payload: expect.objectContaining({ openapi: "3.0.0", correlationId: "c1" })
    }));
  });

  test('publishes httpApiFetched event', async () => {
    const transport = { publish: jest.fn().mockResolvedValue('msg-1') };
    const logger = { error: jest.fn(), info: jest.fn(), debug: jest.fn(), warn: jest.fn() };
    const adapter = new ApiPubsubAdapter({ transport, logger });
    
    const messageId = await adapter.publishHttpApiFetchedEvent({ spec: { paths: {} } }, 'corr-1');
    
    expect(messageId).toBe('msg-1');
    expect(transport.publish).toHaveBeenCalledWith('api-events', expect.objectContaining({
      event: 'httpApiFetched',
      payload: expect.objectContaining({ spec: { paths: {} }, correlationId: 'corr-1' })
    }));
  });
});
