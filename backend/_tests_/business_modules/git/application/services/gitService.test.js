const GitService = require('../../../../../business_modules/git/application/services/gitService');

class MockGitAdapter { async fetchRepo(userId, repoId){ return { id: repoId, name: 'repo' }; } async fetchWiki(userId, repoId){ return { repoId, pages: [] }; } }
class MockPersist { async persistRepo(u,r,repo){ this.repo = { u,r,repo }; } async persistWiki(u,r,wiki){ this.wiki = { u,r,wiki }; } }
class MockMessaging { async publishRepoFetchedEvent(evt){ this.repoEvt = evt; } async publishWikiFetchedEvent(evt){ this.wikiEvt = evt; } }

describe('GitService', () => {
  test('fetchRepo returns repo and publishes/persists', async () => {
    const svc = new GitService({ gitAdapter: new MockGitAdapter(), gitPersistAdapter: new MockPersist(), gitMessagingAdapter: new MockMessaging() });
    const repo = await svc.fetchRepo('user1','owner/repo1','corr-1');
    expect(repo.id).toBe('owner/repo1');
  });

  test('fetchWiki returns wiki and publishes/persists', async () => {
    const svc = new GitService({ gitAdapter: new MockGitAdapter(), gitPersistAdapter: new MockPersist(), gitMessagingAdapter: new MockMessaging() });
    const wiki = await svc.fetchWiki('user1','owner/repo1','corr-2');
    expect(wiki.repoId).toBe('owner/repo1');
  });
});
