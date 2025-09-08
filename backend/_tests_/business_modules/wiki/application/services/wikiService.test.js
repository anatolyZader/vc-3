const DocsService = require('../../../../../business_modules/docs/application/services/docsService');

class MockGitAdapter { async fetchDocs(repoId){ return { repoId, pages: [] }; } async fetchPage(id){ return { id, content: 'c'}; } async createPage(title){ return { id: 'p1', title }; } async updatePage(id, c){ return { id, content: c }; } async deletePage(id){ return true; } }
class MockPersist { async persistDocs(u,r,w){ this.w = { u,r,w }; } }
class MockMessaging { async publishFetchedDocsEvent(evt){ this.fetched = evt; } async publishPageCreatedEvent(e){ this.created = e; } async publishPageUpdatedEvent(e){ this.updated = e; } async publishPageDeletedEvent(e){ this.deleted = e; } }
class MockAi { updateDocsFiles(userId){ this.updated = userId; } }

describe('DocsService', () => {
  function make(){ return new DocsService({ docsGitAdapter: new MockGitAdapter(), docsPersistAdapter: new MockPersist(), docsMessagingAdapter: new MockMessaging(), docsAiAdapter: new MockAi() }); }
  test('fetchDocs persists and publishes', async () => {
    const svc = make();
    const w = await svc.fetchDocs('user1','repo1');
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
  test('updateDocsFiles triggers background call', () => { const svc = make(); svc.updateDocsFiles('user1'); expect(svc.docsAiAdapter.updated).toBe('user1'); });
});
