const IDocsAiPort = require('../../../../../business_modules/docs/domain/ports/IDocsAiPort.js');

describe('IDocsAiPort (abstract)', () => {
  test('cannot instantiate', () => {
    expect(() => new IDocsAiPort()).toThrow('Cannot instantiate an abstract class.');
  });

  test('updateDocsFiles not implemented', async () => {
    class TestPort extends IDocsAiPort {}
    const port = new TestPort();
    await expect(port.updateDocsFiles()).rejects.toThrow('Method not implemented.');
  });
});
