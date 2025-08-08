const Conversation = require('../conversation');

// minimal mock persist port
class MockPersistPort {
  async startConversation(userId, title, conversationId) { this.started = { userId, title, conversationId }; }
  async fetchConversation(userId, conversationId) { this.fetched = { userId, conversationId }; return [{ id: 'm1', role: 'user', content: 'Hi'}]; }
  async renameConversation(userId, conversationId, newTitle) { this.renamed = { userId, conversationId, newTitle }; }
  async deleteConversation(userId, conversationId) { this.deleted = { userId, conversationId }; }
  async addQuestion(userId, conversationId, prompt) { this.addedQuestion = { userId, conversationId, prompt }; return 'q1'; }
  async addAnswer(userId, conversationId, answer) { this.addedAnswer = { userId, conversationId, answer }; return 'a1'; }
}

describe('Conversation Aggregate', () => {
  test('startConversation sets new id and calls port', async () => {
    const mock = new MockPersistPort();
    const conv = new Conversation('user-x');
    const idBefore = conv.conversationId;
    const newId = await conv.startConversation(mock, 'Title');
    expect(newId).toBe(conv.conversationId);
    expect(mock.started).toBeDefined();
    expect(conv.conversationId).not.toBe(idBefore);
  });

  test('fetchConversation loads messages', async () => {
    const mock = new MockPersistPort();
    const conv = new Conversation('user-x');
    const messages = await conv.fetchConversation('conv-1', mock);
    expect(messages.length).toBe(1);
    expect(conv.messages.length).toBe(1);
    expect(mock.fetched).toEqual({ userId: 'user-x', conversationId: 'conv-1' });
  });

  test('renameConversation updates updatedAt and calls port', async () => {
    const mock = new MockPersistPort();
    const conv = new Conversation('user-x', 'conv-1');
    const before = conv.updatedAt;
    await conv.renameConversation('conv-1', 'New', mock);
    expect(conv.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(mock.renamed.newTitle).toBe('New');
  });

  test('deleteConversation calls port', async () => {
    const mock = new MockPersistPort();
    const conv = new Conversation('user-x', 'c1');
    await conv.deleteConversation('c1', mock);
    expect(mock.deleted).toEqual({ userId: 'user-x', conversationId: 'c1' });
  });

  test('addQuestion calls port and returns id', async () => {
    const mock = new MockPersistPort();
    const conv = new Conversation('u', 'c');
    const id = await conv.addQuestion('c', 'Why?', mock);
    expect(id).toBe('q1');
    expect(mock.addedQuestion.prompt).toBe('Why?');
  });

  test('addAnswer normalizes and calls port', async () => {
    const mock = new MockPersistPort();
    const conv = new Conversation('u', 'c');
    const id = await conv.addAnswer('c', { content: 'Because' }, mock);
    expect(id).toBe('a1');
    expect(mock.addedAnswer.answer).toBe('Because');
  });

  test('equals works', () => {
    const a = new Conversation('u1', 'c1');
    const b = new Conversation('u1', 'c1');
    const c = new Conversation('u1', 'c2');
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });
});
