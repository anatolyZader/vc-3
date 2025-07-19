'use strict';

const Wiki = require('../../domain/entities/wiki');
const WikiPage = require('../../domain/entities/wikiPage');
const IWikiService = require('./interfaces/IWikiService');

class WikiService extends IWikiService {

  constructor({WikiGitAdapter, WikiMessagingAdapter, WikiPersistAdapter}) {
    super();
    this.wikiGitAdapter = WikiGitAdapter;
    this.wikiMessagingAdapter = WikiMessagingAdapter;
    this.wikiPersistAdapter = WikiPersistAdapter;
  }

  async fetchWiki(userId, repoId) {
    const wiki = new Wiki(userId);
    const fetchedWiki = await wiki.fetchWiki(repoId, this.wikiGitAdapter);
    if (!fetchedWiki) {
      throw new Error(`Wiki not found for user ${userId} and repo ${repoId}`);
    }
    await this.wikiPersistAdapter.persistWiki(userId, repoId, fetchedWiki);
    // Publish domain event
    const WikiFetchedEvent = require('../../domain/events/wikiFetchedEvent');
    const event = new WikiFetchedEvent({ userId, repoId, wiki: fetchedWiki });
    if (this.wikiMessagingAdapter && typeof this.wikiMessagingAdapter.publishFetchedWikiEvent === 'function') {
      await this.wikiMessagingAdapter.publishFetchedWikiEvent(event);
    }
    return fetchedWiki;
  }

  async fetchPage(userId, repoId, pageId) {
    const wikiPage = new WikiPage(userId, repoId);
    const page = await wikiPage.fetchPage(pageId, this.wikiGitAdapter);
    return page;
  }

  async createPage(userId, repoId, pageTitle) {
    const wikiPage = new WikiPage(userId, repoId);
    const createdPage = await wikiPage.createPage(pageTitle, this.wikiGitAdapter);
    // Publish domain event
    const WikiPageCreatedEvent = require('../../domain/events/wikiPageCreatedEvent');
    const event = new WikiPageCreatedEvent({ userId, repoId, pageId: createdPage?.id, pageTitle });
    if (this.wikiMessagingAdapter && typeof this.wikiMessagingAdapter.publishPageCreatedEvent === 'function') {
      await this.wikiMessagingAdapter.publishPageCreatedEvent(event);
    }
    return createdPage;
  }
  
  async updatePage(userId, repoId, pageId, newContent) {
    const wikiPage = new WikiPage(userId, repoId);
    await wikiPage.updatePage(pageId, newContent, this.wikiGitAdapter);
    // Publish domain event
    const WikiPageUpdatedEvent = require('../../domain/events/wikiPageUpdatedEvent');
    const event = new WikiPageUpdatedEvent({ userId, repoId, pageId, newContent });
    if (this.wikiMessagingAdapter && typeof this.wikiMessagingAdapter.publishPageUpdatedEvent === 'function') {
      await this.wikiMessagingAdapter.publishPageUpdatedEvent(event);
    }
  }

  async deletePage(userId, repoId, pageId) {
    const wikiPage = new WikiPage(userId, repoId);
    await wikiPage.deletePage(pageId, this.wikiGitAdapter);
    // Publish domain event
    const WikiPageDeletedEvent = require('../../domain/events/wikiPageDeletedEvent');
    const event = new WikiPageDeletedEvent({ userId, repoId, pageId });
    if (this.wikiMessagingAdapter && typeof this.wikiMessagingAdapter.publishPageDeletedEvent === 'function') {
      await this.wikiMessagingAdapter.publishPageDeletedEvent(event);
    }
  }
}

module.exports = WikiService;