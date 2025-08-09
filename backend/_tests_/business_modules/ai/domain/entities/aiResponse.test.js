const AIResponse = require('../../../../../business_modules/ai/domain/entities/aiResponse');
const UserId = require('../../../../../business_modules/ai/domain/value_objects/userId');
const Prompt = require('../../../../../business_modules/ai/domain/value_objects/prompt');

describe('AIResponse Entity', () => {
  class MockPort { async respondToPrompt(userId, convId, prompt){ return 'ans'; } }
  test('respondToPrompt returns response and event', async () => {
    const vo = new UserId('u1');
    const entity = new AIResponse(vo);
    const prompt = new Prompt('Hi');
    const { response, event } = await entity.respondToPrompt(vo, 'c1', prompt, new MockPort());
    expect(response).toBe('ans');
    expect(event.userId).toBe('u1');
  });
});
