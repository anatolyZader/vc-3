const WikiFetchedEvent = require('../../../../business_modules/wiki/domain/events/wikiFetchedEvent.js');

describe('WikiFetchedEvent', () => {
  test('creates event', () => {
    const evt = new WikiFetchedEvent({ userId: 'u', repoId: 'r', wiki: { pages: [] }});
    expect(evt.userId).toBe('u');
    expect(evt.repoId).toBe('r');
    expect(evt.eventType).toBe('wikiFetched');
  });
});
