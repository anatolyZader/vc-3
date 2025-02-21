// projectWikiService.js
'use strict';

const WikiPage = require('../../domain/entities/wikiPage');
const pubsubTopics = require('../../../messaging/pubsub/projectWikiPubsubTopics');

class WikiService {

  constructor(projectWikiPersistAdapter, wikiPubsubAdapter) {
    this.wikiPersistAdapter = projectWikiPersistAdapter;
    this.wikiPubsubAdapter = wikiPubsubAdapter;
  }

  async createPage(userId, title, content) {
    const wikiPage = new WikiPage(userId, title, content);
    await wikiPage.create(this.wikiPersistAdapter);

    // Publish the page created event.
    await this.wikiPubsubAdapter.publish(pubsubTopics.PAGE_CREATED, {
      pageId: wikiPage.pageId,
      userId,
      title,
    });

    return wikiPage.pageId;
  }

  async fetchPagesList(userId) {
    return await this.wikiPersistAdapter.fetchPagesList(userId);
  }

  async fetchPage(userId, pageId) {
    const wikiPage = new WikiPage(userId);
    wikiPage.pageId = pageId;
    return await wikiPage.fetchPage(this.wikiPersistAdapter);
  }

  async renamePage(userId, pageId, newTitle) {
    const wikiPage = new WikiPage(userId);
    wikiPage.pageId = pageId;
    await wikiPage.rename(newTitle, this.wikiPersistAdapter);

    // Publish the page renamed event.
    await this.wikiPubsubAdapter.publish(pubsubTopics.PAGE_RENAMED, {
      pageId,
      userId,
      newTitle,
    });
  }

  async deletePage(userId, pageId) {
    await this.wikiPersistAdapter.deletePage(userId, pageId);

    // Publish the page deleted event.
    await this.wikiPubsubAdapter.publish(pubsubTopics.PAGE_DELETED, {
      pageId,
      userId,
    });
  }

  async updatePageContent(userId, pageId, newContent) {
    await this.wikiPersistAdapter.updatePageContent(pageId, newContent);

    // Publish the page content updated event.
    await this.wikiPubsubAdapter.publish(pubsubTopics.PAGE_CONTENT_UPDATED, {
      pageId,
      userId,
      newContent,
    });
  }
}

module.exports = WikiService;
