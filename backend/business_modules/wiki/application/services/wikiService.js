'use strict';

const WikiPage = require('../../domain/entities/wikiPage');
const IWikiService = require('./interfaces/IWikiService');

class WikiService extends IWikiService {

  constructor(wikiGitAdapter, wikiMessagingAdapter, wikiAIAdapter) {
    super();
    this.wikiMessagingAdapter = wikiMessagingAdapter;
    this.wikiGitAdapter = wikiGitAdapter;
    this.wikiAIAdapter = wikiAIAdapter;
    this.topic = 'wiki'; // define a constant topic for wiki events
  }

  async fetchPage(userId, pageId) {
    const wikiPage = new WikiPage(userId);
    const page = await wikiPage.fetchPage(pageId, this.wikiGitAdapter);

    // Publish "pageFetched" event
    try {
      await this.wikiMessagingAdapter.publish(this.topic, {
        event: 'pageFetched',
        userId,
        pageId,
        data: page
      });
    } catch (error) {
      console.error('Error publishing pageFetched event:', error);
    }
    return page;
  }

  async createPage(userId, title) {
    const wikiPage = new WikiPage(userId);
    await wikiPage.createPage(title, this.wikiGitAdapter);

    // Publish "pageCreated" event
    try {
      await this.wikiMessagingAdapter.publish(this.topic, {
        event: 'pageCreated',
        userId,
        pageId: wikiPage.pageId,
        title
      });
    } catch (error) {
      console.error('Error publishing pageCreated event:', error);
    }
    return wikiPage.pageId;
  }

  async updatePage(userId, pageId, newContent) {
    const wikiPage = new WikiPage(userId);
    await wikiPage.updatePage(pageId, newContent, this.wikiGitAdapter);

    // Publish "pageUpdated" event
    try {
      await this.wikiMessagingAdapter.publish(this.topic, {
        event: 'pageUpdated',
        userId,
        pageId,
        newContent
      });
    } catch (error) {
      console.error('Error publishing pageUpdated event:', error);
    }
  }

  async analyzePage(userId, pageId) {
    const wikiPage = new WikiPage(userId);
    const pageData = await wikiPage.fetchPage(pageId, this.wikiGitAdapter);
    const analysisResult = await this.wikiAIAdapter.analyzePage(pageData);

    // Publish "pageAnalyzed" event
    try {
      await this.wikiMessagingAdapter.publish(this.topic, {
        event: 'pageAnalyzed',
        userId,
        pageId,
        analysis: analysisResult
      });
    } catch (error) {
      console.error('Error publishing pageAnalyzed event:', error);
    }
    return analysisResult;
  }

  async deletePage(userId, pageId) {
    const wikiPage = new WikiPage(userId);
    await wikiPage.deletePage(pageId, this.wikiGitAdapter);

    // Publish "pageDeleted" event
    try {
      await this.wikiMessagingAdapter.publish(this.topic, {
        event: 'pageDeleted',
        userId,
        pageId
      });
    } catch (error) {
      console.error('Error publishing pageDeleted event:', error);
    }
  }
}

module.exports = WikiService;
