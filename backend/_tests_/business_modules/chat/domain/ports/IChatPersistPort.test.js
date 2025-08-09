const IChatPersistPort = require('../../../../../business_modules/chat/domain/ports/IChatPersistPort');

describe('Chat domain IChatPersistPort abstract class', () => {
  test('methods throw when not implemented', async () => {
    class TestPort extends IChatPersistPort {}
    const p = new TestPort();
    await expect(p.startConversation()).rejects.toThrow('Method not implemented.');
    await expect(p.deleteConversation()).rejects.toThrow('Method not implemented.');
    await expect(p.renameConversation()).rejects.toThrow('Method not implemented.');
    await expect(p.fetchConversationsHistory()).rejects.toThrow('Method not implemented.');
    await expect(p.fetchConversation()).rejects.toThrow('Method not implemented.');
    await expect(p.addQuestion()).rejects.toThrow('Method not implemented.');
    await expect(p.searchInConversations()).rejects.toThrow('Method not implemented.');
    await expect(p.addAnswer()).rejects.toThrow('Method not implemented.');
  });
});
