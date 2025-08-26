// DocsPageCreatedEvent.js
'use strict';

class DocsPageCreatedEvent {
  constructor({ userId, repoId, pageId, pageTitle, occurredAt = new Date() }) {
    this.eventType = 'docsPageCreated';
    this.userId = userId;
    this.repoId = repoId;
    this.pageId = pageId;
    this.pageTitle = pageTitle;
    this.occurredAt = occurredAt;
  }
}

module.exports = DocsPageCreatedEvent;
