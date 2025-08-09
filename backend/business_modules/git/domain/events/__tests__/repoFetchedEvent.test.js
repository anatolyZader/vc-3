const RepoFetchedEvent = require('../repoFetchedEvent');

describe('RepoFetchedEvent', () => {
  test('creates event', () => {
    const evt = new RepoFetchedEvent({ userId: 'u', repoId: 'r', repo: { name: 'repo'} });
    expect(evt.repoId).toBe('r');
    expect(evt.repo.name).toBe('repo');
    expect(evt.userId).toBe('u');
  });
});
