const ChatService = require('../../../../../business_modules/chat/application/services/chatService');

class MockPersist {
  async startConversation(userId, title, conversationId){ this.started = { userId, title, conversationId }; }
  async fetchConversationsHistory(userId){ return [{ id: 'c1' }]; }
  async fetchConversation(userId, conversationId){ return [{ id: 'm1', role: 'user', content: 'Hi'}]; }
  async addQuestion(userId, conversationId, prompt){ return 'q1'; }
  async addAnswer(userId, conversationId, answer){ return 'a1'; }
  async renameConversation(userId, conversationId, newTitle){ this.renamed = { userId, conversationId, newTitle }; }
  async deleteConversation(userId, conversationId){ this.deleted = { userId, conversationId }; }
}
class MockMessaging {
  async fetchConversation(payload){ this.fetched = payload; }
  async publishEvent(type, evt){ this.published = { type, evt }; }
  async renameConversation(payload){ this.renamed = payload; }
}

describe('ChatService', () => {
  test('startConversation returns id', async () => {
    const svc = new ChatService({ chatPersistAdapter: new MockPersist(), chatMessagingAdapter: new MockMessaging() });
    const id = await svc.startConversation('user1','Title');
    expect(id).toBeDefined();
  });

  test('fetchConversationsHistory returns list', async () => {
    const svc = new ChatService({ chatPersistAdapter: new MockPersist(), chatMessagingAdapter: new MockMessaging() });
    const list = await svc.fetchConversationsHistory('user1');
    expect(list.length).toBe(1);
  });

  test('fetchConversation returns conversation aggregate', async () => {
    const svc = new ChatService({ chatPersistAdapter: new MockPersist(), chatMessagingAdapter: new MockMessaging() });
    const conv = await svc.fetchConversation('user1','c1');
    expect(conv.messages.length).toBe(1);
  });

  test('addQuestion publishes event', async () => {
    const messaging = new MockMessaging();
    const svc = new ChatService({ chatPersistAdapter: new MockPersist(), chatMessagingAdapter: messaging });
    const qid = await svc.addQuestion('user1','c1','Why?');
    expect(qid).toBe('q1');
    expect(messaging.published.type).toBe('questionAdded');
  });

  test('addAnswer returns id', async () => {
    const svc = new ChatService({ chatPersistAdapter: new MockPersist(), chatMessagingAdapter: new MockMessaging() });
    const aid = await svc.addAnswer('user1','c1','Because');
    expect(aid).toBe('a1');
  });

  test('renameConversation returns new title', async () => {
    const persist = new MockPersist();
    const svc = new ChatService({ chatPersistAdapter: persist, chatMessagingAdapter: new MockMessaging() });
    const t = await svc.renameConversation('user1','c1','New');
    expect(t).toBe('New');
  });

  test('deleteConversation returns id', async () => {
    const persist = new MockPersist();
    const svc = new ChatService({ chatPersistAdapter: persist, chatMessagingAdapter: new MockMessaging() });
    const id = await svc.deleteConversation('user1','c1');
    expect(id).toBe('c1');
  });
});
