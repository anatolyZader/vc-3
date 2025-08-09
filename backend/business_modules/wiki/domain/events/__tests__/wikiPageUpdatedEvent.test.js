const WikiPageUpdatedEvent = require('../wikiPageUpdatedEvent');

describe('WikiPageUpdatedEvent', () => {
  test('creates event', () => {
    const evt = new WikiPageUpdatedEvent({ userId: 'u', repoId: 'r', pageId: 'p', newContent: 'NC' });
    expect(evt.newContent).toBe('NC');
    expect(evt.eventType).toBe('wikiPageUpdated');
  });
});
