// safeLogger.js
'use strict';

/**
 * Safe logging utility that redacts sensitive information
 * Prevents accidental exposure of tokens, credentials, and connection strings
 */

const SENSITIVE_KEYS = [
  'token', 'apiKey', 'api_key', 'secret', 'password', 'pwd',
  'authorization', 'auth', 'bearer', 'credentials', 'connectionString',
  'accessToken', 'access_token', 'refreshToken', 'refresh_token',
  'privateKey', 'private_key', 'apiSecret', 'api_secret'
];

/**
 * Redact sensitive fields from an object
 */
function redactSensitiveData(obj, maxDepth = 5, currentDepth = 0) {
  if (currentDepth >= maxDepth) {
    return '[Max depth reached]';
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => redactSensitiveData(item, maxDepth, currentDepth + 1));
  }

  const redacted = {};
  for (const [key, value] of Object.entries(obj)) {
    const keyLower = key.toLowerCase();
    const isSensitive = SENSITIVE_KEYS.some(sensitiveKey => 
      keyLower.includes(sensitiveKey.toLowerCase())
    );

    if (isSensitive) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactSensitiveData(value, maxDepth, currentDepth + 1);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

/**
 * Safe JSON stringify with sensitive data redaction
 */
function safeStringify(obj, space = 2) {
  const redacted = redactSensitiveData(obj);
  return JSON.stringify(redacted, null, space);
}

/**
 * Log object safely - only in development mode or if explicitly enabled
 */
function safeLog(message, obj, options = {}) {
  const { 
    forceLog = false,
    level = 'info'
  } = options;

  const isDevelopment = process.env.NODE_ENV === 'development';
  const isVerbose = process.env.VERBOSE_LOGGING === 'true';

  if (!isDevelopment && !isVerbose && !forceLog) {
    // In production, only log the message without object details
    console[level]?.(message) || console.log(message);
    return;
  }

  // In development or verbose mode, log with redacted object
  const safeObj = redactSensitiveData(obj);
  console[level]?.(message, safeObj) || console.log(message, safeObj);
}

/**
 * Create a safe summary of repoData for logging
 */
function createRepoDataSummary(repoData) {
  if (!repoData) return 'null';
  
  return {
    url: repoData.url ? `${repoData.url.substring(0, 30)}...` : 'undefined',
    branch: repoData.branch || 'undefined',
    owner: repoData.githubOwner || 'undefined',
    repo: repoData.repoName || 'undefined',
    hasCommitHash: !!repoData.commitHash,
    source: repoData.source || 'undefined'
  };
}

module.exports = {
  redactSensitiveData,
  safeStringify,
  safeLog,
  createRepoDataSummary
};
