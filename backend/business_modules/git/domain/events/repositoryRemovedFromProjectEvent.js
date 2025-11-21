// RepositoryRemovedFromProjectEvent.js
class RepositoryRemovedFromProjectEvent {
  constructor({ userId, projectId, repoId, occurredAt = new Date() }) {
    this.userId = userId;
    this.projectId = projectId;
    this.repoId = repoId;
    this.occurredAt = occurredAt;
  }
}
module.exports = RepositoryRemovedFromProjectEvent;
