const Docs = require('../../../../../business_modules/docs/domain/entities/docs.js');

class MockGitPort {
  async fetchDocs(repoId){ this.repoId = repoId; return { repoId, pages: [] }; }
}

describe('Docs Entity', () => {
  test('fetchDocs delegates', async () => {
    const port = new MockGitPort();
    const docs = new Docs('user1');
    const data = await docs.fetchDocs('r1', port);
    expect(data.repoId).toBe('r1');
    expect(port.repoId).toBe('r1');
  });
});
