'use strict';

const Wiki = require('../../domain/entities/wiki');
const WikiPage = require('../../domain/entities/wikiPage');
const IWikiService = require('./interfaces/IWikiService');

class WikiService extends IWikiService {

  constructor({ wikiMessagingAdapter, wikiPersistAdapter, wikiGitAdapter, wikiAiAdapter }) {
    super();
    this.wikiMessagingAdapter = wikiMessagingAdapter;
    this.wikiPersistAdapter = wikiPersistAdapter;
    this.wikiGitAdapter = wikiGitAdapter;
    this.wikiAiAdapter = wikiAiAdapter;
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

  updateWikiFiles(userId) {
    console.log(`[WikiService] Starting background wiki file update for user ${userId}.`);
    try {
      // The adapter's updateWikiFiles method queues the request to run in the background.
      // We call it but don't await it, allowing the service to return immediately.
      // The .bind() is crucial to preserve the 'this' context for the adapter.
      this.wikiAiAdapter.updateWikiFiles.bind(this.wikiAiAdapter)(userId);
      console.log(`[WikiService] Successfully queued wiki file update for user ${userId}.`);
    } catch (error) {
      console.error('[wikiService] Error queuing wiki files update:', error);
      throw error;
    }
  }
}

module.exports = WikiService;