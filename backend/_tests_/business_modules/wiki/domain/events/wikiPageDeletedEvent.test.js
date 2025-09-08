const DocsPageDeletedEvent = require('../../../../../business_modules/docs/domain/events/docsPageDeletedEvent.js');

describe('DocsPageDeletedEvent', () => {
  test('creates event', () => {
    const evt = new DocsPageDeletedEvent({ userId: 'u', repoId: 'r', pageId: 'p' });
    expect(evt.pageId).toBe('p');
    expect(evt.eventType).toBe('docsPageDeleted');
  });
});
