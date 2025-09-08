const IAIPersistPort = require('../../../../../business_modules/ai/domain/ports/IAIPersistPort');

describe('IAIPersistPort abstract', () => {
  test('cannot instantiate', () => {
    expect(() => new IAIPersistPort()).toThrow('Cannot instantiate an abstract class.');
  });
  for (const m of ['saveAiResponse','saveRepoPush']) {
    test(`${m} not implemented`, async () => {
      class T extends IAIPersistPort {}
      await expect(new T()[m]()).rejects.toThrow('Method not implemented.');
    });
  }
});
