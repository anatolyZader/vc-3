const WikiFetchedEvent = require('../wikiFetchedEvent');

describe('WikiFetchedEvent', () => {
  test('creates event', () => {
    const evt = new WikiFetchedEvent({ userId: 'u', repoId: 'r', wiki: { content: 'c'} });
    expect(evt.repoId).toBe('r');
    expect(evt.wiki.content).toBe('c');
    expect(evt.userId).toBe('u');
  });
});
