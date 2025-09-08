const IDocsMessagingPort = require('../../../../../business_modules/docs/domain/ports/IDocsMessagingPort.js');

describe('IDocsMessagingPort (abstract)', () => {
  test('cannot instantiate', () => {
    expect(() => new IDocsMessagingPort()).toThrow('Cannot instantiate an abstract class.');
  });

  test('publishFetchDocsEvent not implemented', async () => {
    class TestPort extends IDocsMessagingPort {}
    const port = new TestPort();
    await expect(port.publishFetchDocsEvent()).rejects.toThrow('Method not implemented.');
  });
});
