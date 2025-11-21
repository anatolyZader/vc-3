// DocsFetchedEvent.js
'use strict';

class DocsFetchedEvent {
  constructor({ userId, repoId, docs, occurredAt = new Date() }) {
    this.eventType = 'docsFetched';
    this.userId = userId;
    this.repoId = repoId;
    this.docs = docs;
    this.occurredAt = occurredAt;
  }
}

module.exports = DocsFetchedEvent;
