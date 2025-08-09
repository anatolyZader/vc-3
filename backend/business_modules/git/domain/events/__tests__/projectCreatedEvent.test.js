const ProjectCreatedEvent = require('../projectCreatedEvent');

describe('ProjectCreatedEvent', () => {
  test('creates event', () => {
    const evt = new ProjectCreatedEvent({ userId: 'u', projectId: 'p', title: 'T' });
    expect(evt.userId).toBe('u');
    expect(evt.projectId).toBe('p');
    expect(evt.title).toBe('T');
    expect(evt.occurredAt).toBeInstanceOf(Date);
  });
});
