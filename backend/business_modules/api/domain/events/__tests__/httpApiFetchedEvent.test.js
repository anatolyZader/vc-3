'use strict';
const HttpApiFetchedEvent = require('../httpApiFetchedEvent');

describe('HttpApiFetchedEvent', () => {
  test('creates with defaults', () => {
    const evt = new HttpApiFetchedEvent({userId:'u', repoId:'r', spec:{}});
    expect(evt.userId).toBe('u');
    expect(evt.repoId).toBe('r');
    expect(evt.spec).toEqual({});
    expect(evt.occurredAt).toBeInstanceOf(Date);
  });
});
