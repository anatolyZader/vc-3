/**
 * Robust hashing for exact deduplication
 * Prevents collision issues from heuristic content-based hashing
 */

const crypto = require('crypto');

/**
 * Normalize text for consistent hashing
 * Removes whitespace variations and basic boilerplate that cause false collisions
 */
function normalize(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')  // Collapse all whitespace to single spaces
    .replace(/^\s+|\s+$/g, '')  // Trim start/end
    .replace(/\/\*\*[\s\S]*?\*\//g, '')  // Remove JSDoc comments
    .replace(/\/\/.*$/gm, '')  // Remove single-line comments
    .replace(/^#.*$/gm, '')  // Remove shell/python comments
    .trim();
}

/**
 * Generate SHA-1 hash for exact deduplication
 * Much more robust than character-based heuristics
 */
function sha1Hash(text) {
  const normalized = normalize(text);
  return crypto.createHash('sha1').update(normalized, 'utf8').digest('hex');
}

/**
 * Alternative: xxHash would be faster but requires native dependency
 * SHA-1 is fast enough and collision-resistant for our use case
 */
function quickHash(text) {
  // Fallback simple hash if crypto not available (shouldn't happen in Node)
  const normalized = normalize(text);
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(16);
}

module.exports = {
  sha1Hash,
  quickHash,
  normalize
};