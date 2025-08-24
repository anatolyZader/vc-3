const WikiPageDeletedEvent = require('../wikiPageDeletedEvent');

describe('WikiPageDeletedEvent', () => {
  test('creates event', () => {
    const evt = new WikiPageDeletedEvent({ userId: 'u', repoId: 'r', pageId: 'p' });
    expect(evt.pageId).toBe('p');
    expect(evt.eventType).toBe('wikiPageDeleted');
  });
});
