const RepoPushedEvent = require('../../../../../business_modules/ai/domain/events/repoPushedEvent');

describe('RepoPushedEvent', () => {
  test('creates event', () => {
    const evt = new RepoPushedEvent({ userId: 'u', repoId: 'r', repoData: {}});
    expect(evt.repoId).toBe('r');
    expect(evt.userId).toBe('u');
  });
});
