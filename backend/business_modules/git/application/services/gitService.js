// gitService.js
'use strict';
/* eslint-disable no-unused-vars */

const Repository = require('../../domain/entities/repository');
const IGitService = require('./interfaces/IGitService');

class GitService extends IGitService {
  constructor({gitMessagingAdapter, gitAdapter, gitPersistAdapter}) {
    super();
    this.gitMessagingAdapter = gitMessagingAdapter;  
    this.gitAdapter = gitAdapter;
    this.gitPersistAdapter = gitPersistAdapter;  
  }

  async fetchRepo(userId, repoId, correlationId) {
    try {
      console.log(`[GitService] Starting fetchRepo: userId=${userId}, repoId=${repoId}`);
      
      // Fetch repo from GitHub
      const repository = new Repository(userId);
      const repo = await repository.fetchRepo(repoId, this.gitAdapter);
      console.log(`[GitService] ✅ Repository fetched from GitHub successfully`);
      
      // Publish to Pub/Sub
      try {
        await this.gitMessagingAdapter.publishRepoFetchedEvent(repo, correlationId);
        console.log(`[GitService] ✅ Event published to Pub/Sub successfully`);
      } catch (pubsubError) {
        console.warn(`[GitService] ⚠️ Pub/Sub publish failed:`, pubsubError.message);
        // Don't throw - continue with persistence
      }
      
      // Persist to database
      try {
        await this.gitPersistAdapter.persistRepo(userId, repoId, repo);
        console.log(`[GitService] ✅ Repository persisted to database successfully`);
      } catch (persistError) {
        console.error(`[GitService] ❌ Database persistence failed:`, {
          message: persistError.message,
          code: persistError.code,
          detail: persistError.detail,
          hint: persistError.hint,
          userId,
          repoId,
          stack: persistError.stack
        });
        throw persistError; // Re-throw database errors for now
      }
      
      console.log(`[GitService] ✅ fetchRepo completed successfully`);
      return repo;
      
    } catch (error) {
      console.error(`[GitService] ❌ fetchRepo failed:`, {
        message: error.message,
        code: error.code,
        detail: error.detail,
        userId,
        repoId,
        correlationId,
        stack: error.stack
      });
      throw error;
    }
  }

  async fetchWiki(userId, repoId, correlationId) {
    try {
      console.log(`[GitService] Starting fetchWiki: userId=${userId}, repoId=${repoId}`);
      
      const repository = new Repository(userId);
      const wiki = await repository.fetchWiki(repoId, this.gitAdapter);
      console.log(`[GitService] ✅ Wiki fetched from GitHub successfully`);
      
      // Publish to Pub/Sub
      try {
        await this.gitMessagingAdapter.publishWikiFetchedEvent(wiki, correlationId);
        console.log(`[GitService] ✅ Wiki event published to Pub/Sub successfully`);
      } catch (pubsubError) {
        console.warn(`[GitService] ⚠️ Pub/Sub publish failed:`, pubsubError.message);
      }
      
      // Persist to database
      try {
        await this.gitPersistAdapter.persistWiki(userId, repoId, wiki);
        console.log(`[GitService] ✅ Wiki persisted to database successfully`);
      } catch (persistError) {
        console.error(`[GitService] ❌ Wiki persistence failed:`, {
          message: persistError.message,
          code: persistError.code,
          detail: persistError.detail,
          userId,
          repoId,
          stack: persistError.stack
        });
        throw persistError;
      }
      
      console.log(`[GitService] ✅ fetchWiki completed successfully`);
      return wiki;
      
    } catch (error) {
      console.error(`[GitService] ❌ fetchWiki failed:`, {
        message: error.message,
        code: error.code,
        detail: error.detail,
        userId,
        repoId,
        correlationId,
        stack: error.stack
      });
      throw error;
    }
  }
}

module.exports = GitService;