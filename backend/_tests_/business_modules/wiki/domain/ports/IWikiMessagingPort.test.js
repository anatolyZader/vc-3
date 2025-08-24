const IWikiMessagingPort = require('../IWikiMessagingPort');

describe('IWikiMessagingPort (abstract)', () => {
  test('cannot instantiate', () => {
    expect(() => new IWikiMessagingPort()).toThrow('Cannot instantiate an abstract class.');
  });

  test('publishFetchWikiEvent not implemented', async () => {
    class TestPort extends IWikiMessagingPort {}
    const port = new TestPort();
    await expect(port.publishFetchWikiEvent()).rejects.toThrow('Method not implemented.');
  });
});
