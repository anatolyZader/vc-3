// RepoFetchedEvent.js
class RepoFetchedEvent {
  constructor({ userId, repoId, repo, occurredAt = new Date() }) {
    this.userId = userId;
    this.repoId = repoId;
    this.repo = repo;
    this.occurredAt = occurredAt;
  }
}
module.exports = RepoFetchedEvent;
