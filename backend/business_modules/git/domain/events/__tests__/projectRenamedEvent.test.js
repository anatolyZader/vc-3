const ProjectRenamedEvent = require('../projectRenamedEvent');

describe('ProjectRenamedEvent', () => {
  test('creates event', () => {
    const evt = new ProjectRenamedEvent({ userId: 'u', projectId: 'p', newTitle: 'N' });
    expect(evt.newTitle).toBe('N');
    expect(evt.userId).toBe('u');
    expect(evt.occurredAt).toBeInstanceOf(Date);
  });
});
