const ConversationsHistory = require('../../../../../business_modules/chat/domain/entities/conversationsHistory');

describe('Chat domain ConversationsHistory entity', () => {
  test('fetchConversationsHistory delegates to port', async () => {
    const mockPort = { fetchConversationsHistory: jest.fn().mockResolvedValue([{ id: '1' }]) };
    const h = new ConversationsHistory('u');
    const res = await h.fetchConversationsHistory(mockPort);
    expect(mockPort.fetchConversationsHistory).toHaveBeenCalledWith('u');
    expect(res).toEqual([{ id: '1' }]);
  });
});
