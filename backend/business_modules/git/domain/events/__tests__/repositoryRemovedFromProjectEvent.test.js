const RepositoryRemovedFromProjectEvent = require('../repositoryRemovedFromProjectEvent');

describe('RepositoryRemovedFromProjectEvent', () => {
  test('creates event', () => {
    const evt = new RepositoryRemovedFromProjectEvent({ userId: 'u', projectId: 'p', repoId: 'r' });
    expect(evt.repoId).toBe('r');
    expect(evt.projectId).toBe('p');
    expect(evt.userId).toBe('u');
  });
});
