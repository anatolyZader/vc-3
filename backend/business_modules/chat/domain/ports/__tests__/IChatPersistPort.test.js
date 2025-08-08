const IChatPersistPort = require('../IChatPersistPort');

describe('IChatPersistPort (abstract)', () => {
  test('cannot instantiate directly', () => {
    expect(() => new IChatPersistPort()).toThrow('Cannot instantiate an abstract class.');
  });

  const methods = [
    'startConversation','deleteConversation','renameConversation','fetchConversationsHistory','fetchConversation','addQuestion','searchInConversations','addAnswer'
  ];

  for (const m of methods) {
    test(`${m} not implemented`, async () => {
      class TestPort extends IChatPersistPort {}
      const port = new TestPort();
      // dynamic call
      await expect(port[m]()).rejects.toThrow('Method not implemented.');
    });
  }
});
