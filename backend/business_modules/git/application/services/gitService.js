// gitService.js
'use strict';
/* eslint-disable no-unused-vars */

const Repository = require('../../domain/entities/repository');
const IGitService = require('./interfaces/IGitService');
const UserId = require('../../domain/value_objects/userId');
const RepoId = require('../../domain/value_objects/repoId');
const RepoFetchedEvent = require('../../domain/events/repoFetchedEvent');
const RepoPersistedEvent = require('../../domain/events/repoPersistedEvent');
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

  async persistRepo(userIdRaw, repoIdRaw, branch = 'main', options = {}) {
    try {
      const { forceUpdate = false, includeHistory = true, correlationId } = options;
      const userId = new UserId(userIdRaw);
      const repoId = new RepoId(repoIdRaw);
      console.log(`[GitService] Starting persistRepo: userId=${userId}, repoId=${repoId}, branch=${branch}, forceUpdate=${forceUpdate}`);
      
      // Create repository domain entity
      const repository = new Repository(userId);
      
      // Check if repository already exists (if not forcing update)
      if (!forceUpdate) {
        try {
          const existingRepo = await this.gitPersistAdapter.getRepo(userId.value, repoId.value);
          if (existingRepo) {
            console.log(`[GitService] ⚠️ Repository already exists and forceUpdate=false`);
            throw new Error(`Repository ${repoId.value} already exists for user ${userId.value}. Use forceUpdate=true to overwrite.`);
          }
        } catch (getError) {
          // If error is "not found", continue with persistence
          if (!getError.message.includes('not found') && !getError.message.includes('does not exist')) {
            throw getError;
          }
          console.log(`[GitService] Repository does not exist, proceeding with persistence`);
        }
      }
      
      // Fetch repository data from GitHub
      const repoData = await repository.fetchRepo(repoId.value, this.gitAdapter);
      console.log(`[GitService] ✅ Repository data fetched from GitHub successfully`);
      
      // Persist to database with additional metadata
      const persistResult = await this.gitPersistAdapter.persistRepo(
        userId.value, 
        repoId.value, 
        repoData, 
        { branch, includeHistory, persistedAt: new Date().toISOString() }
      );
      console.log(`[GitService] ✅ Repository persisted to database successfully`);
      
      // Create and publish domain event (you may want to create RepoPersistedEvent)
      const event = new RepoPersistedEvent({ 
        userId: userId.value, 
        repoId: repoId.value, 
        repo: repoData,
        action: 'persist',
        branch,
        forceUpdate,
        persistedAt: new Date().toISOString()
      });
      await this.gitMessagingAdapter.publishRepoPersistedEvent(event, correlationId);
      console.log(`[GitService] ✅ Persistence event published to Pub/Sub successfully`);
      
      const result = {
        success: true,
        repositoryId: repoId.value,
        owner: repoId.value.split('/')[0],
        repo: repoId.value.split('/')[1],
        branch,
        persistedAt: new Date().toISOString(),
        filesProcessed: repoData.files?.length || 0,
        message: forceUpdate ? 'Repository updated successfully' : 'Repository persisted successfully'
      };
      
      console.log(`[GitService] ✅ persistRepo completed successfully`);
      return result;
      
    } catch (error) {
      console.error(`[GitService] ❌ persistRepo failed:`, {
        message: error.message,
        code: error.code,
        detail: error.detail,
        userId: userIdRaw,
        repoId: repoIdRaw,
        branch,
        options,
        stack: error.stack
      });
      throw error;
    }
  }
}

module.exports = GitService;