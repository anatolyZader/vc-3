const AIService = require('../../../../../business_modules/ai/application/services/aiService');

class MockAiAdapter { async processPushedRepo(u,r,d){ this.called={u,r,d}; return 'Repo processed'; } }
class MockPersist { async saveRepoPush(p){ this.saved=p; } }
class MockMsg { async publishAiResponse(t,e){ this.t=t; this.e=e; } }

describe('AIService.processPushedRepo (relocated)', () => {
  test('works', async () => {
    const svc = new AIService({ aiAdapter: new MockAiAdapter(), aiPersistAdapter: new MockPersist(), aiMessagingAdapter: new MockMsg() });
    const r = await svc.processPushedRepo('user1','repo1',{});
    expect(r).toBe('Repo processed');
  });
});
