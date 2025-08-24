const WikiPage = require('../../../../business_modules/wiki/domain/entities/wikiPage.js');

class MockGitPort {
  async fetchPage(pageId){ this.fetched = pageId; return { id: pageId, content: 'c'}; }
  async createPage(pageTitle){ this.created = pageTitle; return { id: 'p1', title: pageTitle }; }
  async updatePage(pageId, newContent){ this.updated = { pageId, newContent }; return { id: pageId, content: newContent }; }
  async deletePage(pageId){ this.deleted = pageId; return true; }
}

describe('WikiPage Entity', () => {
  test('fetchPage delegates', async () => {
    const port = new MockGitPort();
    const page = new WikiPage('u','r');
    const data = await page.fetchPage('p1', port);
    expect(data.id).toBe('p1');
    expect(port.fetched).toBe('p1');
  });

  test('createPage delegates', async () => {
    const port = new MockGitPort();
    const page = new WikiPage('u','r');
    const created = await page.createPage('Title', port);
    expect(created.title).toBe('Title');
    expect(port.created).toBe('Title');
  });

  test('updatePage delegates', async () => {
    const port = new MockGitPort();
    const page = new WikiPage('u','r');
    const updated = await page.updatePage('p1', 'New', port);
    expect(updated.content).toBe('New');
    expect(port.updated).toEqual({ pageId: 'p1', newContent: 'New' });
  });

  test('deletePage delegates', async () => {
    const port = new MockGitPort();
    const page = new WikiPage('u','r');
    const res = await page.deletePage('p1', port);
    expect(res).toBe(true);
    expect(port.deleted).toBe('p1');
  });
});
