// gitPubsubAdapter.js
'use strict';

class GitPubsubAdapter {
  constructor({ pubSubClient }) {
    this.pubSubClient = pubSubClient;
    this.topicName = process.env.PUBSUB_GIT_EVENTS_TOPIC_NAME || 'git-topic';
  }

  async publishRepoFetchedEvent(result, correlationId) {
    const event = {
      event: 'repositoryFetched',
      correlationId, // Include correlationId directly in the event payload
      ...result
    };
    const dataBuffer = Buffer.from(JSON.stringify(event));
    try {
      // Use the injected client instance to get the topic
      const topic = this.pubSubClient.topic(this.topicName);
      const messageId = await topic.publishMessage({ data: dataBuffer });
      console.log(`Published 'repositoryFetched' event with message ID: ${messageId} to topic: ${this.topicName}`);
      return messageId;
    } catch (error) {
      console.error(`Error publishing 'repositoryFetched' event to topic ${this.topicName}:`, error);
      throw error;
    }
  }

  async publishDocsFetchedEvent(result, correlationId) {
    const event = {
      event: 'docsFetched',
      correlationId, // Include correlationId directly in the event payload
      ...result
    };
    const dataBuffer = Buffer.from(JSON.stringify(event));
    try {
      // Use the injected client instance to get the topic
      const topic = this.pubSubClient.topic(this.topicName);
      const messageId = await topic.publishMessage({ data: dataBuffer });
      console.log(`Published 'docsFetched' event with message ID: ${messageId} to topic: ${this.topicName}`);
      return messageId;
    } catch (error) {
      console.error(`Error publishing 'docsFetched' event to topic ${this.topicName}:`, error);
      throw error;
    }
  }

  async publishRepoPersistedEvent(event, correlationId) {
    // DUAL-PATH ARCHITECTURE:
    // Path 1: GitHubb Actions publishes repoPushed events directly (primary)
    // Path 2: Git API persist endpoint also publishes (fallback for manual triggers)
    // Both use the same payload format for consistency
    
    const [owner, name] = event.repoId.split('/');
    
    // Payload format matches GitHub Actions workflow (deploy.yml)
    // This ensures AI module receives consistent data from both sources
    const eventPayload = {
      event: 'repoPushed',
      eventType: 'repoPushed',
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
        updatedAt: event.repo?.repository?.updated_at,
        source: 'git-module-api'
      },
      timestamp: event.timestamp || new Date().toISOString()
    };
    const dataBuffer = Buffer.from(JSON.stringify(eventPayload));
    try {
      const topic = this.pubSubClient.topic(this.topicName);
      const messageId = await topic.publishMessage({ data: dataBuffer });
      console.log(`✅ Published 'repoPushed' event (from repoPersisted) with message ID: ${messageId} to topic: ${this.topicName}`);
      console.log(`📋 Event payload: userId=${event.userId}, repoId=${event.repoId}, branch=${event.branch}`);
      return messageId;
    } catch (error) {
      console.error(`❌ Error publishing 'repoPushed' event to topic ${this.topicName}:`, error);
      throw error;
    }
  }
}

module.exports = GitPubsubAdapter;