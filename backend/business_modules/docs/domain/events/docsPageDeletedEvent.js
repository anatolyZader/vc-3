// DocsPageDeletedEvent.js
'use strict';

class DocsPageDeletedEvent {
  constructor({ userId, repoId, pageId, occurredAt = new Date() }) {
    this.eventType = 'docsPageDeleted';
    this.userId = userId;
    this.repoId = repoId;
    this.pageId = pageId;
    this.occurredAt = occurredAt;
  }
}

module.exports = DocsPageDeletedEvent;
