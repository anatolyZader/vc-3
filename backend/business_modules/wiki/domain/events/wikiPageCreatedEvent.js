// WikiPageCreatedEvent.js
'use strict';

class WikiPageCreatedEvent {
  constructor({ userId, repoId, pageId, pageTitle, occurredAt = new Date() }) {
    this.eventType = 'wikiPageCreated';
    this.userId = userId;
    this.repoId = repoId;
    this.pageId = pageId;
    this.pageTitle = pageTitle;
    this.occurredAt = occurredAt;
  }
}

module.exports = WikiPageCreatedEvent;
