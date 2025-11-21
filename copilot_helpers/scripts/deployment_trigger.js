// deployment_trigger.js - AGGRESSIVE cache-busting deployment trigger

const timestamp = new Date().toISOString();
const commit = process.env.GITHUB_SHA || 'local-trigger';
const randomId = Math.random().toString(36).substring(7);

console.log(`🚀 AGGRESSIVE DEPLOYMENT TRIGGER: ${timestamp} - commit: ${commit} - id: ${randomId}`);
console.log('🌐 This trigger FORCES a complete container rebuild to activate cloud-native backend loader');
console.log('🔧 Expected change: Backend file loading should switch from git to GitHub API');
console.log('💥 CACHE BUSTING: Random deployment ID to force rebuild');

// Force cache invalidation with dynamic content
const cacheBuster = {
  trigger_timestamp: timestamp,
  commit_hash: commit,
  deployment_id: randomId,
  purpose: 'AGGRESSIVE_CACHE_BUSTING_FOR_CLOUD_NATIVE_LOADER',
  build_number: Date.now(),
  force_rebuild: true
};

module.exports = cacheBuster;