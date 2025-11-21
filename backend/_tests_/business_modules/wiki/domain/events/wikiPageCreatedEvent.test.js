const DocsPageCreatedEvent = require('../../../../../business_modules/docs/domain/events/docsPageCreatedEvent.js');

describe('DocsPageCreatedEvent', () => {
  test('creates event', () => {
    const evt = new DocsPageCreatedEvent({ userId: 'u', repoId: 'r', pageId: 'p', pageTitle: 'T' });
    expect(evt.pageTitle).toBe('T');
    expect(evt.eventType).toBe('docsPageCreated');
  });
});
