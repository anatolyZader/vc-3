// projectWikiService.js
'use strict';

const WikiPage = require('../../domain/entities/wikiPage');

class WikiService {

  constructor(wikiGitAdapter, wikiMessagingAdapter, wikiPersistAdapter) {
    this.wikiPersistAdapter = wikiPersistAdapter;
    this.wikiPubsubAdapter = wikiMessagingAdapter;
    this.wikiGitAdapter = wikiGitAdapter;
  }

  async createPage(userId, title, content) {
    const wikiPage = new WikiPage(userId, title, content);
    await wikiPage.create(this.wikiGitAdapter);

    // // Publish the page created event.
    // await this.wikiMessagingAdapter.publish(pubsubTopics.PAGE_CREATED, {
    //   pageId: wikiPage.pageId,
    //   userId,
    //   title,
    // });

    return wikiPage.pageId;
  }

  async fetchPagesList(userId) {
    return await this.wikiGitAdapter.fetchPagesList(userId);
  }

  async fetchPage(userId, pageId) {
    const wikiPage = new WikiPage(userId);
    return await wikiPage.fetchPage(pageId, this.wikiGitAdapter);
  }

  async renamePage(userId, pageId, newTitle) {
    const wikiPage = new WikiPage(userId);
    wikiPage.pageId = pageId;
    await wikiPage.rename(newTitle, this.wikiGitAdapter);

    // Publish the page renamed event.
    // await this.wikiMessagingAdapter.publish(pubsubTopics.PAGE_RENAMED, {
    //   pageId,
    //   userId,
    //   newTitle,
    // });
  }

  async deletePage(userId, pageId) {
    await this.wikiGitAdapter.deletePage(userId, pageId);
  }

  async updatePageContent(userId, pageId, newContent) {

    console.log('Updating page content...', userId, pageId, newContent);

    // await this.wikiPersistAdapter.updatePageContent(pageId, newContent);

    // Publish the page content updated event.
  //   await this.wikiMessagingAdapter.publish(pubsubTopics.PAGE_CONTENT_UPDATED, {
  //     pageId,
  //     userId,
  //     newContent,
  //   });
}
}

module.exports = WikiService;
