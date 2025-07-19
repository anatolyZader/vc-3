// WikiFetchedEvent.js
'use strict';

class WikiFetchedEvent {
  constructor({ userId, repoId, wiki, occurredAt = new Date() }) {
    this.eventType = 'wikiFetched';
    this.userId = userId;
    this.repoId = repoId;
    this.wiki = wiki;
    this.occurredAt = occurredAt;
  }
}

module.exports = WikiFetchedEvent;
