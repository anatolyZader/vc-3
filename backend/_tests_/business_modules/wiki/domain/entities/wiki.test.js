const Wiki = require('../../../../business_modules/wiki/domain/entities/wiki.js');

class MockGitPort {
  async fetchWiki(repoId){ this.repoId = repoId; return { repoId, pages: [] }; }
}

describe('Wiki Entity', () => {
  test('fetchWiki delegates', async () => {
    const port = new MockGitPort();
    const wiki = new Wiki('user1');
    const data = await wiki.fetchWiki('r1', port);
    expect(data.repoId).toBe('r1');
    expect(port.repoId).toBe('r1');
  });
});
