// gitPubsubAdapter.js
'use strict';

const { getChannelName } = require('../../../../../messageChannels');

class GitPubsubAdapter {
  constructor({ transport, logger }) {
    this.transport = transport;
    this.log = logger;
    this.topicName = getChannelName('git');
  }

  async publishRepoFetchedEvent(result, correlationId) {
    const envelope = {
      event: 'repositoryFetched',
      payload: { ...result, correlationId },
      timestamp: new Date().toISOString(),
      source: 'git-module'
    };
    try {
      const messageId = await this.transport.publish(this.topicName, envelope);
      this.log.info({ messageId, correlationId, topic: this.topicName }, 'Published repositoryFetched event');
      return messageId;
    } catch (error) {
      this.log.error({ error, correlationId, topic: this.topicName }, 'Error publishing repositoryFetched event');
      throw error;
    }
  }

  async publishDocsFetchedEvent(result, correlationId) {
    const envelope = {
      event: 'docsFetched',
      payload: { ...result, correlationId },
      timestamp: new Date().toISOString(),
      source: 'git-module'
    };
    try {
      const messageId = await this.transport.publish(this.topicName, envelope);
      this.log.info({ messageId, correlationId, topic: this.topicName }, 'Published docsFetched event');
      return messageId;
    } catch (error) {
      this.log.error({ error, correlationId, topic: this.topicName }, 'Error publishing docsFetched event');
      throw error;
    }
  }

  async publishRepoPersistedEvent(event, correlationId) {
    // DUAL-PATH ARCHITECTURE:
    // Path 1: GitHub Actions publishes repoPushed events directly (primary)
    // Path 2: Git API persist endpoint also publishes (fallback for manual triggers)
    // Both use the same payload format for consistency
    
    const [owner, name] = event.repoId.split('/');
    
    // Payload format matches GitHub Actions workflow (deploy.yml)
    // This ensures AI module receives consistent data from both sources
    const envelope = {
      event: 'repoPushed',
      payload: {
        correlationId,
        userId: event.userId,
        repoId: event.repoId,
        repoData: {
          // CRITICAL: AI module's ContextPipeline validates these fields
          url: `https://github.com/${event.repoId}`,
          branch: event.branch || 'main',
          githubOwner: owner,
          repoName: name,
          // Optional metadata enrichment from GitHub API response
          description: event.repo?.repository?.description,
          defaultBranch: event.repo?.repository?.default_branch,
          language: event.repo?.repository?.language,
          stargazersCount: event.repo?.repository?.stargazers_count,
          forksCount: event.repo?.repository?.forks_count,
          updatedAt: event.repo?.repository?.updated_at
        }
      },
      timestamp: event.timestamp || new Date().toISOString(),
      source: 'git-module-api'
    };
    
    try {
      const messageId = await this.transport.publish(this.topicName, envelope);
      this.log.info({ messageId, userId: event.userId, repoId: event.repoId, topic: this.topicName }, 'Published repoPushed event (from repoPersisted)');
      return messageId;
    } catch (error) {
      this.log.error({ error, userId: event.userId, repoId: event.repoId, topic: this.topicName }, 'Error publishing repoPushed event');
      throw error;
    }
  }
}

module.exports = GitPubsubAdapter;