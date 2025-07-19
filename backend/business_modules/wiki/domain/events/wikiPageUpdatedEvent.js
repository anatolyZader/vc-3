// WikiPageUpdatedEvent.js
'use strict';

class WikiPageUpdatedEvent {
  constructor({ userId, repoId, pageId, newContent, occurredAt = new Date() }) {
    this.eventType = 'wikiPageUpdated';
    this.userId = userId;
    this.repoId = repoId;
    this.pageId = pageId;
    this.newContent = newContent;
    this.occurredAt = occurredAt;
  }
}

module.exports = WikiPageUpdatedEvent;
