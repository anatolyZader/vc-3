'use strict';
const RepoPushedEvent = require('../repoPushedEvent');

describe('RepoPushedEvent', () => {
  test('creates with defaults', () => {
    const data = { userId:'u', repoId:'r', repoData:{a:1} };
    const evt = new RepoPushedEvent(data);
    expect(evt.userId).toBe('u');
    expect(evt.repoId).toBe('r');
    expect(evt.repoData).toEqual({a:1});
    expect(evt.occurredAt).toBeInstanceOf(Date);
  });
});
