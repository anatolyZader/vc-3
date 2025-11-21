// messageChannels.js
'use strict';

/**
 * Central configuration for logical message channels.
 * 
 * This maps logical channel names to transport-specific configurations:
 * - In Redis: channel name is used directly as Redis channel
 * - In GCP Pub/Sub: can map to { topic, subscription } pairs
 */

module.exports = {
  // Git-related events (repo fetching, pushing, etc.)
  git: {
    channel: 'git-events',
    description: 'Repository operations, docs fetched, repo pushed events'
  },
  
  // AI-related events (responses, processing results, etc.)  
  ai: {
    channel: 'ai-events',
    description: 'AI responses, processing completions, analysis results'
  },
  
  // Chat-related events (conversations, questions, answers)
  chat: {
    channel: 'chat-events', 
    description: 'Chat conversations, questions added, answers added'
  },
  
  // API-related events (HTTP API fetched, etc.)
  api: {
    channel: 'api-events',
    description: 'HTTP API discovery, fetching results'
  },
  
  // Docs-related events (documentation updates, etc.)
  docs: {
    channel: 'docs-events',
    description: 'Documentation fetching, updates, processing'
  }
};

/**
 * Helper to get channel name for a logical channel
 * @param {string} logicalChannel - One of: 'git', 'ai', 'chat', 'api', 'docs'
 * @returns {string} The transport channel name
 */
function getChannelName(logicalChannel) {
  const config = module.exports[logicalChannel];
  if (!config) {
    throw new Error(`Unknown logical channel: ${logicalChannel}`);
  }
  return config.channel;
}

module.exports.getChannelName = getChannelName;