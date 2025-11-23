const DocsPubsubAdapter = require('../../../../../../business_modules/docs/infrastructure/messaging/pubsub/docsPubsubAdapter');

describe('DocsPubsubAdapter', () => {
  test('publishfetchedDocsEvent publishes event', async () => {
    const transport = { publish: jest.fn().mockResolvedValue('w1') };
    const logger = { info: jest.fn(), error: jest.fn() };
    const adapter = new DocsPubsubAdapter({ transport, logger });
    
    const id = await adapter.publishfetchedDocsEvent({ repoId: 'owner/repo', pages: [] });
    
    expect(id).toBe('w1');
    expect(transport.publish).toHaveBeenCalledWith('docs-events', expect.objectContaining({
      event: 'docsFetched',
      payload: expect.objectContaining({ repoId: 'owner/repo', pages: [] })
    }));
  });
});
