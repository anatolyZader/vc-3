#!/usr/bin/env node
/**
 * Publish Repository Index Event to Google Cloud Pub/Sub
 * 
 * This script is called from GitHub Actions after a successful deploy.
 * It publishes a "repoPushed" event directly to Pub/Sub, triggering
 * the AI module to index the repository for RAG/semantic search.
 * 
 * Environment Variables Required:
 * - GOOGLE_APPLICATION_CREDENTIALS: Path to GCP service account key
 * - USER_ID: The user ID who owns this repository
 * - REPO_OWNER: GitHub repository owner
 * - REPO_NAME: GitHub repository name
 * - BRANCH: Git branch that was pushed
 * - COMMIT_SHA: Full commit hash
 * - COMMIT_MESSAGE: (Optional) Commit message
 * - PUBSUB_PROJECT_ID: (Optional) GCP project ID
 * - PUBSUB_TOPIC: (Optional) Pub/Sub topic name, defaults to 'git-topic'
 */

const { PubSub } = require('@google-cloud/pubsub');

async function publishIndexEvent() {
  console.log('📤 Publishing repository index event to Pub/Sub...');
  
  // Validate required environment variables
  const requiredEnvVars = ['USER_ID', 'REPO_OWNER', 'REPO_NAME', 'BRANCH', 'COMMIT_SHA'];
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
  
  const {
    USER_ID,
    REPO_OWNER,
    REPO_NAME,
    BRANCH,
    COMMIT_SHA,
    COMMIT_MESSAGE = '',
    PUBSUB_PROJECT_ID,
    PUBSUB_TOPIC = 'git-topic'
  } = process.env;
  
  const repoId = `${REPO_OWNER}/${REPO_NAME}`;
  const repoUrl = `https://github.com/${repoId}`;
  
  console.log(`📋 Repository: ${repoId}`);
  console.log(`🌿 Branch: ${BRANCH}`);
  console.log(`📝 Commit: ${COMMIT_SHA.substring(0, 8)}`);
  console.log(`👤 User ID: ${USER_ID}`);
  
  try {
    // Initialize Pub/Sub client
    const pubSubClient = new PubSub(PUBSUB_PROJECT_ID ? { projectId: PUBSUB_PROJECT_ID } : {});
    const topic = pubSubClient.topic(PUBSUB_TOPIC);
    
    // Construct the event payload matching AI module's expectations
    const event = {
      event: 'repoPushed',
      eventType: 'repoPushed',
      userId: USER_ID,
      repoId: repoId,
      repoData: {
        url: repoUrl,
        branch: BRANCH,
        githubOwner: REPO_OWNER,
        repoName: REPO_NAME,
        commitHash: COMMIT_SHA,
        commitMessage: COMMIT_MESSAGE,
        source: 'github-actions'
      },
      timestamp: new Date().toISOString(),
      correlationId: `gh-${COMMIT_SHA.substring(0, 8)}-${Date.now()}`
    };
    
    console.log(`📦 Event payload: ${JSON.stringify(event, null, 2)}`);
    
    // Publish to Pub/Sub
    const dataBuffer = Buffer.from(JSON.stringify(event));
    const messageId = await topic.publishMessage({ data: dataBuffer });
    
    console.log(`✅ Successfully published event with message ID: ${messageId}`);
    console.log(`📨 Topic: ${PUBSUB_TOPIC}`);
    console.log(`🎯 AI module will now index the repository automatically`);
    
    process.exit(0);
    
  } catch (error) {
    console.error(`❌ Error publishing event to Pub/Sub:`, error);
    console.error(`Error details:`, {
      message: error.message,
      code: error.code,
      details: error.details
    });
    process.exit(1);
  }
}

// Run the script (top-level await)
await publishIndexEvent();
