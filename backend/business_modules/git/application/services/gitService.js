// gitService.js
'use strict';
/* eslint-disable no-unused-vars */

const Repository = require('../../domain/entities/repository');
const IGitService = require('./interfaces/IGitService');
const UserId = require('../../domain/value_objects/userId');
const RepoId = require('../../domain/value_objects/repoId');
const RepoFetchedEvent = require('../../domain/events/repoFetchedEvent');
const DocsFetchedEvent = require('../../domain/events/docsFetchedEvent');

class GitService extends IGitService {
  constructor({gitMessagingAdapter, gitAdapter, gitPersistAdapter}) {
    super();
    this.gitMessagingAdapter = gitMessagingAdapter;  
    this.gitAdapter = gitAdapter;
    this.gitPersistAdapter = gitPersistAdapter;  
  }

  async fetchRepo(userIdRaw, repoIdRaw, correlationId) {
    try {
      const userId = new UserId(userIdRaw);
      const repoId = new RepoId(repoIdRaw);
      console.log(`[GitService] Starting fetchRepo: userId=${userId}, repoId=${repoId}`);
      
      // Fetch repo from GitHub
      const repository = new Repository(userId);
      const repo = await repository.fetchRepo(repoId.value, this.gitAdapter);
      console.log(`[GitService] ✅ Repository fetched from GitHub successfully`);
      
      // Publish domain event
      const event = new RepoFetchedEvent({ userId: userId.value, repoId: repoId.value, repo });
      await this.gitMessagingAdapter.publishRepoFetchedEvent(event, correlationId);
      console.log(`[GitService] ✅ Event published to Pub/Sub successfully`);
      
      // Persist to database
      await this.gitPersistAdapter.persistRepo(userId.value, repoId.value, repo);
      console.log(`[GitService] ✅ Repository persisted to database successfully`);
      
      console.log(`[GitService] ✅ fetchRepo completed successfully`);
      return repo;
      
    } catch (error) {
      console.error(`[GitService] ❌ fetchRepo failed:`, {
        message: error.message,
        code: error.code,
        detail: error.detail,
        userId: userIdRaw,
        repoId: repoIdRaw,
        correlationId,
        stack: error.stack
      });
      throw error;
    }
  }

  async fetchDocs(userIdRaw, repoIdRaw, correlationId) {
    try {
      const userId = new UserId(userIdRaw);
      const repoId = new RepoId(repoIdRaw);
      console.log(`[GitService] Starting fetchDocs: userId=${userId}, repoId=${repoId}`);
      
      const repository = new Repository(userId);
      const docsData = await repository.fetchDocs(repoId.value, this.gitAdapter);
      console.log(`[GitService] ✅ Docs fetched from GitHub successfully`);
      
      // Publish domain event
      const event = new DocsFetchedEvent({ userId: userId.value, repoId: repoId.value, docs: docsData });
      await this.gitMessagingAdapter.publishDocsFetchedEvent(event, correlationId);
      console.log(`[GitService] ✅ Docs event published to Pub/Sub successfully`);
      
      // Persist to database
      await this.gitPersistAdapter.persistDocs(userId.value, repoId.value, docsData);
      console.log(`[GitService] ✅ Docs persisted to database successfully`);
      
      console.log(`[GitService] ✅ fetchDocs completed successfully`);
      return docsData;
      
    } catch (error) {
      console.error(`[GitService] ❌ fetchDocs failed:`, {
        message: error.message,
        code: error.code,
        detail: error.detail,
        userId: userIdRaw,
        repoId: repoIdRaw,
        correlationId,
        stack: error.stack
      });
      throw error;
    }
  }
}

module.exports = GitService;