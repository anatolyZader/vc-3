class RepoPushedEvent {
  constructor({ userId, repoId, repoData, occurredAt = new Date() }) {
    this.userId = userId;
    this.repoId = repoId;
    this.repoData = repoData;
    this.occurredAt = occurredAt;
  }
}
module.exports = RepoPushedEvent;