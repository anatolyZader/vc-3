class HttpApiFetchedEvent {
  constructor({ userId, repoId, spec, occurredAt = new Date() }) {
    this.userId = userId;
    this.repoId = repoId;
    this.spec = spec;
    this.occurredAt = occurredAt;
  }
}
module.exports = HttpApiFetchedEvent;