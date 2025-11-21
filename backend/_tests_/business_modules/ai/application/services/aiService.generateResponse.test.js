const AIService = require('../../../../../business_modules/ai/application/services/aiService');

describe('AIService.generateResponse (relocated)', () => {
  test('basic path', async () => {
    class Adapter { setUserId(id){ this.id=id; } async respondToPrompt(){ return 'Ans'; } }
    const svc = new AIService({ aiAdapter: new Adapter() });
    const out = await svc.generateResponse('Prompt','user1');
    expect(out).toBe('Ans');
  });
});
