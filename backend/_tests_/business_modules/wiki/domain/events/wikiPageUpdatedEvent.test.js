const DocsPageUpdatedEvent = require('../../../../../business_modules/docs/domain/events/docsPageUpdatedEvent.js');

describe('DocsPageUpdatedEvent', () => {
  test('creates event', () => {
    const evt = new DocsPageUpdatedEvent({ userId: 'u', repoId: 'r', pageId: 'p', newContent: 'NC' });
    expect(evt.newContent).toBe('NC');
    expect(evt.eventType).toBe('docsPageUpdated');
  });
});
