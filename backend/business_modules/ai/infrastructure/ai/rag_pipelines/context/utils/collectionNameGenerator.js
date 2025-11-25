/**
 * Collection Name Generator for PostgreSQL pgvector
 * 
 * Replaces hardcoded Pinecone namespaces with dynamic collection naming
 * based on repository context for better organization and scalability.
 */

class CollectionNameGenerator {
  /**
   * Generate collection name for PostgreSQL based on repository context
   * @param {Object} repoData - Repository data containing repoId, owner, name etc.
   * @returns {string} - Collection name for PostgreSQL
   */
  static generateForRepository(repoData) {
    if (!repoData) {
      console.warn('[CollectionNameGenerator] No repoData provided, using default collection');
      return 'repo_default';
    }

    // Try to use repoId first (format: owner/repo)
    if (repoData.repoId) {
      return `repo_${repoData.repoId.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()}`;
    }

    // Fallback to owner + repoName if available
    if (repoData.githubOwner && repoData.repoName) {
      return `repo_${repoData.githubOwner}_${repoData.repoName}`.toLowerCase();
    }

    // Fallback to just repoName if available
    if (repoData.repoName) {
      return `repo_${repoData.repoName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()}`;
    }

    console.warn('[CollectionNameGenerator] Could not generate collection name from repoData:', repoData);
    return 'repo_default';
  }

  /**
   * Generate collection name for a specific user's repositories
   * @param {string} userId - User identifier
   * @param {Object} repoData - Repository data
   * @returns {string} - User-specific collection name
   */
  static generateForUser(userId, repoData) {
    const baseCollectionName = this.generateForRepository(repoData);
    if (userId && userId !== 'anonymous') {
      // Create user-specific collection to avoid conflicts
      return `user_${userId.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()}_${baseCollectionName}`;
    }
    return baseCollectionName;
  }

  /**
   * Get legacy Pinecone namespace for backward compatibility during migration
   * @returns {string} - The hardcoded namespace previously used
   */
  static getLegacyNamespace() {
    return 'd41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3';
  }

  /**
   * Check if a collection name is valid for PostgreSQL
   * @param {string} collectionName - Collection name to validate
   * @returns {boolean} - True if valid
   */
  static isValidCollectionName(collectionName) {
    // PostgreSQL table name restrictions
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(collectionName) && collectionName.length <= 63;
  }
}

module.exports = CollectionNameGenerator;