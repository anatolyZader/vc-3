const IChatMessagingPort = require('../IChatMessagingPort');

describe('IChatMessagingPort (abstract)', () => {
  test('cannot instantiate directly', () => {
    expect(() => new IChatMessagingPort()).toThrow('Cannot instantiate an abstract class.');
  });

  test('method addQuestion not implemented', async () => {
    class TestPort extends IChatMessagingPort {}
    const port = new TestPort();
    await expect(port.addQuestion('q')).rejects.toThrow('Method not implemented.');
  });
});
