const AIService = require('../../../../../business_modules/ai/application/services/aiService');

class MockAiAdapter { async respondToPrompt(u,c,p){ this.called={u,c,p}; return 'AI answer'; } }
class MockPersist { async saveAiResponse(p){ this.saved=p; } }
class MockMsg { async publishAiResponse(type, event){ this.type=type; this.event=event; } }

describe('AIService.respondToPrompt (relocated)', () => {
  test('works end to end', async () => {
    const svc = new AIService({ aiAdapter: new MockAiAdapter(), aiPersistAdapter: new MockPersist(), aiMessagingAdapter: new MockMsg() });
    const res = await svc.respondToPrompt('user1','conv1','Hello');
    expect(res).toBe('AI answer');
  });
});
