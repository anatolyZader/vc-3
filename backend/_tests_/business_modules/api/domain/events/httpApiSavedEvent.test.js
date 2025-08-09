'use strict';
const HttpApiSavedEvent = require('../../../../../business_modules/api/domain/events/httpApiSavedEvent');

describe('HttpApiSavedEvent', () => {
  test('creates with defaults', () => {
    const evt = new HttpApiSavedEvent({userId:'u', repoId:'r', spec:{}});
    expect(evt.userId).toBe('u');
    expect(evt.repoId).toBe('r');
    expect(evt.spec).toEqual({});
    expect(evt.occurredAt).toBeInstanceOf(Date);
  });
});
