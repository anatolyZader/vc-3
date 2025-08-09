const GitProject = require('../gitProject');

class MockPersistPort {
  async createProject(userId, data){ this.created = { userId, data }; }
  async renameProject(projectId, title){ this.renamed = { projectId, title }; }
  async addRepositoryToProject(projectId, repoId){ this.addedRepo = { projectId, repoId }; }
  async removeRepositoryFromProject(projectId, repoId){ this.removedRepo = { projectId, repoId }; }
}
class MockMessaging {
  async publishProjectCreatedEvent(evt){ this.createdEvt = evt; }
  async publishProjectRenamedEvent(evt){ this.renamedEvt = evt; }
  async publishRepositoryAddedToProjectEvent(evt){ this.addedEvt = evt; }
  async publishRepositoryRemovedFromProjectEvent(evt){ this.removedEvt = evt; }
}

describe('GitProject Aggregate', () => {
  test('create publishes event and persists', async () => {
    const persist = new MockPersistPort();
    const msg = new MockMessaging();
    const project = new GitProject('user1', 'Title');
    await project.create(persist, msg);
    expect(persist.created).toBeDefined();
    expect(msg.createdEvt).toBeDefined();
  });

  test('rename updates title and publishes event', async () => {
    const persist = new MockPersistPort();
    const msg = new MockMessaging();
    const project = new GitProject('user1', 'Title');
    await project.create(persist, msg);
    await project.rename('New', persist, msg);
    expect(project.title).toBe('New');
    expect(msg.renamedEvt.newTitle).toBe('New');
  });

  test('addRepository persists and publishes event', async () => {
    const persist = new MockPersistPort();
    const msg = new MockMessaging();
    const project = new GitProject('user1', 'Title');
    await project.create(persist, msg);
    await project.addRepository('repo1', persist, msg);
    expect(project.repositories).toContain('repo1');
    expect(msg.addedEvt.repoId).toBe('repo1');
  });

  test('removeRepository persists and publishes event', async () => {
    const persist = new MockPersistPort();
    const msg = new MockMessaging();
    const project = new GitProject('user1', 'Title');
    await project.create(persist, msg);
    await project.addRepository('repo1', persist, msg);
    await project.removeRepository('repo1', persist, msg);
    expect(project.repositories).not.toContain('repo1');
    expect(msg.removedEvt.repoId).toBe('repo1');
  });
});
