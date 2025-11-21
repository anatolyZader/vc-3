'use strict';

const Docs = require('../../domain/entities/docs');
const DocsPage = require('../../domain/entities/docsPage');
const IDocsService = require('./interfaces/IDocsService');

class DocsService extends IDocsService {

  constructor({ docsMessagingAdapter, docsPersistAdapter, docsGitAdapter, docsAiAdapter }) {
    super();
    this.docsMessagingAdapter = docsMessagingAdapter;
    this.docsPersistAdapter = docsPersistAdapter;
    this.docsGitAdapter = docsGitAdapter;
    this.docsAiAdapter = docsAiAdapter;
  }

  async fetchDocs(userId, repoId) {
    const docs = new Docs(userId);
    const fetchedDocs = await docs.fetchDocs(repoId, this.docsGitAdapter);
    if (!fetchedDocs) {
      throw new Error(`Docs not found for user ${userId} and repo ${repoId}`);
    }
    await this.docsPersistAdapter.persistDocs(userId, repoId, fetchedDocs);
    // Publish domain event
    const DocsFetchedEvent = require('../../domain/events/docsFetchedEvent');
    const event = new DocsFetchedEvent({ userId, repoId, docs: fetchedDocs });
    if (this.docsMessagingAdapter && typeof this.docsMessagingAdapter.publishFetchedDocsEvent === 'function') {
      await this.docsMessagingAdapter.publishFetchedDocsEvent(event);
    }
    return fetchedDocs;
  }

  async fetchPage(userId, repoId, pageId) {
    const docsPage = new DocsPage(userId, repoId);
    const page = await docsPage.fetchPage(pageId, this.docsGitAdapter);
    return page;
  }

  async createPage(userId, repoId, pageTitle) {
    const docsPage = new DocsPage(userId, repoId);
    const createdPage = await docsPage.createPage(pageTitle, this.docsGitAdapter);
    // Publish domain event
    const DocsPageCreatedEvent = require('../../domain/events/docsPageCreatedEvent');
    const event = new DocsPageCreatedEvent({ userId, repoId, pageId: createdPage?.id, pageTitle });
    if (this.docsMessagingAdapter && typeof this.docsMessagingAdapter.publishPageCreatedEvent === 'function') {
      await this.docsMessagingAdapter.publishPageCreatedEvent(event);
    }
    return createdPage;
  }
  
  async updatePage(userId, repoId, pageId, newContent) {
    const docsPage = new DocsPage(userId, repoId);
    await docsPage.updatePage(pageId, newContent, this.docsGitAdapter);
    // Publish domain event
    const DocsPageUpdatedEvent = require('../../domain/events/docsPageUpdatedEvent');
    const event = new DocsPageUpdatedEvent({ userId, repoId, pageId, newContent });
    if (this.docsMessagingAdapter && typeof this.docsMessagingAdapter.publishPageUpdatedEvent === 'function') {
      await this.docsMessagingAdapter.publishPageUpdatedEvent(event);
    }
  }

  async deletePage(userId, repoId, pageId) {
    const docsPage = new DocsPage(userId, repoId);
    await docsPage.deletePage(pageId, this.docsGitAdapter);
    // Publish domain event
    const DocsPageDeletedEvent = require('../../domain/events/docsPageDeletedEvent');
    const event = new DocsPageDeletedEvent({ userId, repoId, pageId });
    if (this.docsMessagingAdapter && typeof this.docsMessagingAdapter.publishPageDeletedEvent === 'function') {
      await this.docsMessagingAdapter.publishPageDeletedEvent(event);
    }
  }

  updateDocsFiles(userId) {
    console.log(`[DocsService] Starting background docs file update for user ${userId}.`);
    try {
      // The adapter's updateDocsFiles method queues the request to run in the background.
      // We call it but don't await it, allowing the service to return immediately.
      // The .bind() is crucial to preserve the 'this' context for the adapter.
      this.docsAiAdapter.updateDocsFiles.bind(this.docsAiAdapter)(userId);
      console.log(`[DocsService] Successfully queued docs file update for user ${userId}.`);
    } catch (error) {
      console.error('[docsService] Error queuing docs files update:', error);
      throw error;
    }
  }
}

module.exports = DocsService;