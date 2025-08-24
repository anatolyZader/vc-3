const IWikiAiPort = require('../../../../business_modules/wiki/domain/ports/IWikiAiPort.js');

describe('IWikiAiPort (abstract)', () => {
  test('cannot instantiate', () => {
    expect(() => new IWikiAiPort()).toThrow('Cannot instantiate an abstract class.');
  });

  test('updateWikiFiles not implemented', async () => {
    class TestPort extends IWikiAiPort {}
    const port = new TestPort();
    await expect(port.updateWikiFiles()).rejects.toThrow('Method not implemented.');
  });
});
