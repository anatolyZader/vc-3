const WikiPageCreatedEvent = require('../../../../../business_modules/wiki/domain/events/wikiPageCreatedEvent.js');

describe('WikiPageCreatedEvent', () => {
  test('creates event', () => {
    const evt = new WikiPageCreatedEvent({ userId: 'u', repoId: 'r', pageId: 'p', pageTitle: 'T' });
    expect(evt.pageTitle).toBe('T');
    expect(evt.eventType).toBe('wikiPageCreated');
  });
});
