const IChatMessagingPort = require('../../../../../business_modules/chat/domain/ports/IChatMessagingPort');

describe('Chat domain IChatMessagingPort abstract class', () => {
  test('methods throw when not implemented', async () => {
    class TestPort extends IChatMessagingPort {}
    const p = new TestPort();
    await expect(p.addQuestion()).rejects.toThrow('Method not implemented.');
  });
});
