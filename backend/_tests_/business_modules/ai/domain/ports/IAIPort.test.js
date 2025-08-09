const IAIPort = require('../../../../../business_modules/ai/domain/ports/IAIPort');

describe('IAIPort abstract', () => {
  test('cannot instantiate', () => {
    expect(() => new IAIPort()).toThrow('Cannot instantiate an abstract class.');
  });
  test('respondToPrompt not implemented', async () => {
    class T extends IAIPort {}
    await expect(new T().respondToPrompt()).rejects.toThrow('Method not implemented.');
  });
});
