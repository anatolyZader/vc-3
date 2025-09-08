// DocsPageUpdatedEvent.js
'use strict';

class DocsPageUpdatedEvent {
  constructor({ userId, repoId, pageId, newContent, occurredAt = new Date() }) {
    this.eventType = 'docsPageUpdated';
    this.userId = userId;
    this.repoId = repoId;
    this.pageId = pageId;
    this.newContent = newContent;
    this.occurredAt = occurredAt;
  }
}

module.exports = DocsPageUpdatedEvent;
