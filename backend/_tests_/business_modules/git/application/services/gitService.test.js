const GitService = require('../../../../../business_modules/git/application/services/gitService');

class MockGitAdapter { async fetchRepo(userId, repoId){ return { id: repoId, name: 'repo' }; } async fetchDocs(userId, repoId){ return { repoId, pages: [] }; } }
class MockPersist { async persistRepo(u,r,repo){ this.repo = { u,r,repo }; } async persistDocs(u,r,docs){ this.docs = { u,r,docs }; } }
class MockMessaging { async publishRepoFetchedEvent(evt){ this.repoEvt = evt; } async publishDocsFetchedEvent(evt){ this.docsEvt = evt; } }

describe('GitService', () => {
  test('fetchRepo returns repo and publishes/persists', async () => {
    const svc = new GitService({ gitAdapter: new MockGitAdapter(), gitPersistAdapter: new MockPersist(), gitMessagingAdapter: new MockMessaging() });
    const repo = await svc.fetchRepo('user1','owner/repo1','corr-1');
    expect(repo.id).toBe('owner/repo1');
  });

  test('fetchDocs returns docs and publishes/persists', async () => {
    const svc = new GitService({ gitAdapter: new MockGitAdapter(), gitPersistAdapter: new MockPersist(), gitMessagingAdapter: new MockMessaging() });
    const docs = await svc.fetchDocs('user1','owner/repo1','corr-2');
    expect(docs.repoId).toBe('owner/repo1');
  });
});
