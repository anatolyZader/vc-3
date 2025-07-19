// WikiPageDeletedEvent.js
'use strict';

class WikiPageDeletedEvent {
  constructor({ userId, repoId, pageId, occurredAt = new Date() }) {
    this.eventType = 'wikiPageDeleted';
    this.userId = userId;
    this.repoId = repoId;
    this.pageId = pageId;
    this.occurredAt = occurredAt;
  }
}

module.exports = WikiPageDeletedEvent;
