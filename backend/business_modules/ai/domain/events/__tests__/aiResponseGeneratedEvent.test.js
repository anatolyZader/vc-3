'use strict';
const AiResponseGeneratedEvent = require('../aiResponseGeneratedEvent');

describe('AiResponseGeneratedEvent', () => {
  test('creates with defaults', () => {
    const evt = new AiResponseGeneratedEvent({userId:'u',conversationId:'c',prompt:'p',response:'r'});
    expect(evt.userId).toBe('u');
    expect(evt.conversationId).toBe('c');
    expect(evt.prompt).toBe('p');
    expect(evt.response).toBe('r');
    expect(evt.occurredAt).toBeInstanceOf(Date);
  });
});
