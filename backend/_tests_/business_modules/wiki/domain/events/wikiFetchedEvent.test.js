const DocsFetchedEvent = require('../../../../../business_modules/docs/domain/events/docsFetchedEvent.js');

describe('DocsFetchedEvent', () => {
  test('creates event', () => {
    const evt = new DocsFetchedEvent({ userId: 'u', repoId: 'r', docs: { pages: [] }});
    expect(evt.userId).toBe('u');
    expect(evt.repoId).toBe('r');
    expect(evt.eventType).toBe('docsFetched');
  });
});
