const RepositoryAddedToProjectEvent = require('../repositoryAddedToProjectEvent');

describe('RepositoryAddedToProjectEvent', () => {
  test('creates event', () => {
    const evt = new RepositoryAddedToProjectEvent({ userId: 'u', projectId: 'p', repoId: 'r' });
    expect(evt.repoId).toBe('r');
    expect(evt.projectId).toBe('p');
    expect(evt.userId).toBe('u');
  });
});
