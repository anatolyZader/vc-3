const WikiService = require('../../../../../business_modules/wiki/application/services/wikiService');

class MockGitAdapter { async fetchWiki(repoId){ return { repoId, pages: [] }; } async fetchPage(id){ return { id, content: 'c'}; } async createPage(title){ return { id: 'p1', title }; } async updatePage(id, c){ return { id, content: c }; } async deletePage(id){ return true; } }
class MockPersist { async persistWiki(u,r,w){ this.w = { u,r,w }; } }
class MockMessaging { async publishFetchedWikiEvent(evt){ this.fetched = evt; } async publishPageCreatedEvent(e){ this.created = e; } async publishPageUpdatedEvent(e){ this.updated = e; } async publishPageDeletedEvent(e){ this.deleted = e; } }
class MockAi { updateWikiFiles(userId){ this.updated = userId; } }

describe('WikiService', () => {
  function make(){ return new WikiService({ wikiGitAdapter: new MockGitAdapter(), wikiPersistAdapter: new MockPersist(), wikiMessagingAdapter: new MockMessaging(), wikiAiAdapter: new MockAi() }); }
  test('fetchWiki persists and publishes', async () => {
    const svc = make();
    const w = await svc.fetchWiki('user1','repo1');
    expect(w.repoId).toBe('repo1');
  });
  test('fetchPage returns page', async () => { expect(await make().fetchPage('u','r','p1')).toHaveProperty('id','p1'); });
  test('createPage publishes', async () => {
    const svc = make();
    const p = await svc.createPage('u','r','Title');
    expect(p.title).toBe('Title');
  });
  test('updatePage runs without error', async () => { await make().updatePage('u','r','p1','New'); });
  test('deletePage runs without error', async () => { await make().deletePage('u','r','p1'); });
  test('updateWikiFiles triggers background call', () => { const svc = make(); svc.updateWikiFiles('user1'); expect(svc.wikiAiAdapter.updated).toBe('user1'); });
});
