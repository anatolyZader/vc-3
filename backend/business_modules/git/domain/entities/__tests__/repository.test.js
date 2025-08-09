const Repository = require('../repository');

class MockGitPort {
  async fetchRepo(userId, repoId){ this.repoArgs = { userId, repoId }; return { id: repoId, name: 'r' }; }
  async fetchWiki(userId, repoId){ this.wikiArgs = { userId, repoId }; return { repoId, wiki: 'content' }; }
}

describe('Repository Entity', () => {
  test('fetchRepo delegates to port', async () => {
    const port = new MockGitPort();
    const repo = new Repository('user1');
    const data = await repo.fetchRepo('r1', port);
    expect(data.id).toBe('r1');
    expect(port.repoArgs).toEqual({ userId: 'user1', repoId: 'r1' });
  });

  test('fetchWiki delegates to port', async () => {
    const port = new MockGitPort();
    const repo = new Repository('user1');
    const wiki = await repo.fetchWiki('r1', port);
    expect(wiki.repoId).toBe('r1');
    expect(port.wikiArgs).toEqual({ userId: 'user1', repoId: 'r1' });
  });
});
