const Conversation = require('../../../../../business_modules/chat/domain/aggregates/conversation');

describe('Chat domain Conversation aggregate', () => {
  test('constructs with userId and random id', () => {
    const c = new Conversation('user1');
    expect(c.userId).toBe('user1');
    expect(c.conversationId).toBeDefined();
    expect(c.messages).toEqual([]);
  });

  test('equals', () => {
    const c1 = new Conversation('u', 'id');
    const c2 = new Conversation('u', 'id');
    expect(c1.equals(c2)).toBe(true);
  });

  test('startConversation calls port', async () => {
    const mockPort = { startConversation: jest.fn().mockResolvedValue() };
    const c = new Conversation('u');
    const id = await c.startConversation(mockPort, 'My Chat');
    expect(mockPort.startConversation).toHaveBeenCalledWith('u', 'My Chat', id);
  });

  test('addQuestion passes through and returns id', async () => {
    const mockPort = { addQuestion: jest.fn().mockResolvedValue('m1') };
    const c = new Conversation('u', 'cid');
    const mid = await c.addQuestion('cid', 'Why?', mockPort);
    expect(mockPort.addQuestion).toHaveBeenCalledWith('u', 'cid', 'Why?');
    expect(mid).toBe('m1');
  });

  test('addAnswer normalizes object answer', async () => {
    const mockPort = { addAnswer: jest.fn().mockResolvedValue('m2') };
    const c = new Conversation('u', 'cid');
    const mid = await c.addAnswer('cid', { content: 'Answer text' }, mockPort);
    expect(mockPort.addAnswer).toHaveBeenCalledWith('u', 'cid', 'Answer text');
    expect(mid).toBe('m2');
  });
});
