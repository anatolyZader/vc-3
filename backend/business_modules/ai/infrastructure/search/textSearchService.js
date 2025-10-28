// textSearchService.js
'use strict';

/**
 * TextSearchService - PostgreSQL-based text search functionality
 * 
 * Provides full-text search capabilities over stored documents using PostgreSQL's
 * built-in text search features. This complements the vector search from Pinecone
 * by offering exact text matching and keyword-based search.
 */
class TextSearchService {
  constructor({ postgresAdapter, logger = console }) {
    this.postgresAdapter = postgresAdapter;
    this.logger = logger;
  }

  /**
   * Perform basic text search across documents
   * @param {string} searchQuery - The text to search for
   * @param {object} options - Search options
   * @param {string} options.userId - Filter by user ID
   * @param {string} options.repoId - Filter by repository ID
   * @param {number} options.limit - Maximum number of results (default: 10)
   * @param {number} options.offset - Offset for pagination (default: 0)
   * @returns {Array} Array of search results
   */
  async searchDocuments(searchQuery, options = {}) {
    const {
      userId = null,
      repoId = null,
      limit = 10,
      offset = 0
    } = options;

    try {
      const pool = await this.postgresAdapter.getPool();
      const client = await pool.connect();

      try {
        // Extract potential filenames from query
        // Pattern 1: Full filenames with extensions (e.g., "aiService.js", "app.js")
        const filenameWithExtPattern = /\b[\w-]+\.(js|ts|jsx|tsx|py|java|go|rs|md|json|yml|yaml|sql|css|html)\b/gi;
        const filenamesWithExt = searchQuery.match(filenameWithExtPattern) || [];
        
        // Pattern 2: Potential filenames without extensions (e.g., "aiService", "app")
        // Only consider words that look like filenames (camelCase, kebab-case, snake_case)
        const filenameNoExtPattern = /\b([a-z][a-zA-Z0-9_-]*(?:[A-Z][a-zA-Z0-9_-]*)*)\b/g;
        const potentialNames = searchQuery.match(filenameNoExtPattern) || [];
        
        // Filter out common words that are unlikely to be filenames
        const commonWords = new Set(['the', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'from', 'by', 'as', 'is', 'was', 'are', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'can', 'between', 'difference', 'explain', 'what', 'how', 'why', 'when', 'where', 'file', 'files']);
        const likelyFilenames = potentialNames.filter(name => 
          !commonWords.has(name.toLowerCase()) && 
          name.length > 2 && 
          (name.includes('_') || name.includes('-') || /[a-z][A-Z]/.test(name)) // Has separators or camelCase
        );
        
        const allPotentialFiles = [...filenamesWithExt, ...likelyFilenames];
        
        // If query contains filenames, prioritize file path search
        if (allPotentialFiles.length > 0) {
          this.logger.info(`🔍 Detected potential filenames: ${allPotentialFiles.join(', ')}`);
          
          // Build dynamic LIKE conditions for all potential filenames
          const likeConditions = allPotentialFiles.map((_, i) => {
            return `(file_path ILIKE $${i + 1} OR file_path ILIKE $${allPotentialFiles.length + i + 1})`;
          });
          
          // Search by file path using case-insensitive LIKE
          let query = `
            SELECT 
              id,
              user_id,
              repo_id,
              file_path,
              file_extension,
              content,
              CASE 
                -- Exact filename match gets highest priority
                ${allPotentialFiles.map((fn, i) => `WHEN file_path ILIKE '%/${fn}' THEN ${1.0 - i * 0.1}`).join('\n                ')}
                -- Filename anywhere in path gets medium priority
                ${allPotentialFiles.map((fn, i) => `WHEN file_path ILIKE '%${fn}%' THEN ${0.5 - i * 0.05}`).join('\n                ')}
                ELSE 0.1
              END AS rank,
              substring(content, 1, 200) AS snippet
            FROM repo_data
            WHERE (${likeConditions.join(' OR ')})
          `;
          
          const queryParams = [
            ...allPotentialFiles.map(fn => `%/${fn}`),  // Exact filename at end of path
            ...allPotentialFiles.map(fn => `%${fn}%`)    // Filename anywhere in path
          ];
          let paramIndex = queryParams.length;
          
          // Add filters
          if (userId) {
            paramIndex++;
            query += ` AND user_id = $${paramIndex}`;
            queryParams.push(userId);
          }

          if (repoId) {
            paramIndex++;
            query += ` AND repo_id = $${paramIndex}`;
            queryParams.push(repoId);
          }

          // Add ordering and pagination
          query += ` ORDER BY rank DESC, file_path ASC`;
          
          paramIndex++;
          query += ` LIMIT $${paramIndex}`;
          queryParams.push(limit);

          paramIndex++;
          query += ` OFFSET $${paramIndex}`;
          queryParams.push(offset);

          const result = await client.query(query, queryParams);
          
          this.logger.info(`📄 Filename-based search found ${result.rows.length} results`);
          if (result.rows.length > 0) {
            result.rows.forEach((row, i) => {
              this.logger.info(`   ${i + 1}. ${row.file_path} (rank: ${row.rank})`);
            });
          }
          
          // Format results
          return result.rows.map(row => ({
            id: row.id,
            userId: row.user_id,
            repoId: row.repo_id,
            filePath: row.file_path,
            fileExtension: row.file_extension,
            content: row.content,
            rank: parseFloat(row.rank),
            snippet: row.snippet,
            searchType: 'filename_match',
            source: 'postgres'
          }));
        }
        
        // Otherwise, fall back to full-text search on content
        this.logger.info(`📝 No filenames detected, using content-based full-text search`);
        let query = `
          SELECT 
            id,
            user_id,
            repo_id,
            file_path,
            file_extension,
            content,
            ts_rank(content_vector, plainto_tsquery('english', $1)) AS rank,
            ts_headline('english', content, plainto_tsquery('english', $1)) AS snippet
          FROM repo_data
          WHERE content_vector @@ plainto_tsquery('english', $1)
        `;

        const queryParams = [searchQuery];
        let paramIndex = 1;

        // Add filters
        if (userId) {
          paramIndex++;
          query += ` AND user_id = $${paramIndex}`;
          queryParams.push(userId);
        }

        if (repoId) {
          paramIndex++;
          query += ` AND repo_id = $${paramIndex}`;
          queryParams.push(repoId);
        }

        // Add ordering and pagination
        query += ` ORDER BY rank DESC, id DESC`;
        
        paramIndex++;
        query += ` LIMIT $${paramIndex}`;
        queryParams.push(limit);

        paramIndex++;
        query += ` OFFSET $${paramIndex}`;
        queryParams.push(offset);

        this.logger.info(`🔍 Text search query: "${searchQuery}" with ${queryParams.length - 1} filters`);
        
        const result = await client.query(query, queryParams);
        
        this.logger.info(`📄 Text search found ${result.rows.length} results`);
        
        // Format results
        return result.rows.map(row => ({
          id: row.id,
          userId: row.user_id,
          repoId: row.repo_id,
          filePath: row.file_path,
          fileExtension: row.file_extension,
          content: row.content,
          rank: parseFloat(row.rank),
          snippet: row.snippet,
          searchType: 'text',
          source: 'postgres'
        }));

      } finally {
        client.release();
      }
    } catch (error) {
      this.logger.error('Text search error:', error);
      throw new Error(`Text search failed: ${error.message}`);
    }
  }

  /**
   * Perform case-insensitive partial text search using ILIKE
   * @param {string} searchQuery - The text to search for
   * @param {object} options - Search options (same as searchDocuments)
   * @returns {Array} Array of search results
   */
  async searchDocumentsSimple(searchQuery, options = {}) {
    const {
      userId = null,
      repoId = null,
      limit = 10,
      offset = 0
    } = options;

    try {
      const pool = await this.postgresAdapter.getPool();
      const client = await pool.connect();

      try {
        let query = `
          SELECT 
            id,
            user_id,
            repo_id,
            file_path,
            file_extension,
            content,
            CASE 
              WHEN content ILIKE $1 THEN 1.0
              WHEN content ILIKE '%' || $1 || '%' THEN 0.5
              ELSE 0.1
            END AS rank
          FROM repo_data
          WHERE content ILIKE '%' || $1 || '%'
        `;

        const queryParams = [searchQuery];
        let paramIndex = 1;

        // Add filters
        if (userId) {
          paramIndex++;
          query += ` AND user_id = $${paramIndex}`;
          queryParams.push(userId);
        }

        if (repoId) {
          paramIndex++;
          query += ` AND repo_id = $${paramIndex}`;
          queryParams.push(repoId);
        }

        // Add ordering and pagination
        query += ` ORDER BY rank DESC, id DESC`;
        
        paramIndex++;
        query += ` LIMIT $${paramIndex}`;
        queryParams.push(limit);

        paramIndex++;
        query += ` OFFSET $${paramIndex}`;
        queryParams.push(offset);

        this.logger.info(`🔍 Simple text search query: "${searchQuery}"`);
        
        const result = await client.query(query, queryParams);
        
        this.logger.info(`📄 Simple text search found ${result.rows.length} results`);
        
        // Format results
        return result.rows.map(row => ({
          id: row.id,
          userId: row.user_id,
          repoId: row.repo_id,
          filePath: row.file_path,
          fileExtension: row.file_extension,
          content: row.content,
          rank: parseFloat(row.rank),
          snippet: this.createSnippet(row.content, searchQuery),
          searchType: 'simple_text',
          source: 'postgres'
        }));

      } finally {
        client.release();
      }
    } catch (error) {
      this.logger.error('Simple text search error:', error);
      throw new Error(`Simple text search failed: ${error.message}`);
    }
  }

  /**
   * Create a snippet highlighting the search term
   * @param {string} content - Full content
   * @param {string} searchTerm - Search term to highlight
   * @returns {string} Snippet with highlighted term
   */
  createSnippet(content, searchTerm, maxLength = 200) {
    if (!content || !searchTerm) return content;

    const searchIndex = content.toLowerCase().indexOf(searchTerm.toLowerCase());
    if (searchIndex === -1) return content.substring(0, maxLength);

    const start = Math.max(0, searchIndex - 50);
    const end = Math.min(content.length, searchIndex + searchTerm.length + 50);
    
    let snippet = content.substring(start, end);
    
    // Add ellipsis if we truncated
    if (start > 0) snippet = '...' + snippet;
    if (end < content.length) snippet = snippet + '...';

    return snippet;
  }

  /**
   * Get search statistics
   * @param {string} userId - Optional user filter
   * @param {string} repoId - Optional repo filter
   * @returns {object} Statistics about searchable documents
   */
  async getSearchStats(userId = null, repoId = null) {
    try {
      const pool = await this.postgresAdapter.getPool();
      const client = await pool.connect();

      try {
        let query = `
          SELECT 
            COUNT(*) as total_documents,
            COUNT(DISTINCT user_id) as unique_users,
            COUNT(DISTINCT repo_id) as unique_repos,
            COUNT(DISTINCT file_extension) as unique_file_types,
            AVG(LENGTH(content)) as avg_content_length
          FROM repo_data
          WHERE 1=1
        `;

        const queryParams = [];
        let paramIndex = 0;

        if (userId) {
          paramIndex++;
          query += ` AND user_id = $${paramIndex}`;
          queryParams.push(userId);
        }

        if (repoId) {
          paramIndex++;
          query += ` AND repo_id = $${paramIndex}`;
          queryParams.push(repoId);
        }

        const result = await client.query(query, queryParams);
        
        return {
          totalDocuments: parseInt(result.rows[0].total_documents),
          uniqueUsers: parseInt(result.rows[0].unique_users),
          uniqueRepos: parseInt(result.rows[0].unique_repos),
          uniqueFileTypes: parseInt(result.rows[0].unique_file_types),
          avgContentLength: Math.round(parseFloat(result.rows[0].avg_content_length) || 0)
        };

      } finally {
        client.release();
      }
    } catch (error) {
      this.logger.error('Error getting search stats:', error);
      throw new Error(`Failed to get search stats: ${error.message}`);
    }
  }

  /**
   * Check if text search is available (database connection working)
   * @returns {boolean} True if text search is available
   */
  async isAvailable() {
    try {
      const pool = await this.postgresAdapter.getPool();
      const client = await pool.connect();
      
      try {
        await client.query('SELECT 1');
        return true;
      } finally {
        client.release();
      }
    } catch (error) {
      this.logger.warn('Text search not available:', error.message);
      return false;
    }
  }

  /**
   * Store document chunks to repo_data table for full-text search
   * @param {Array} chunks - Array of document chunks with pageContent and metadata
   * @param {string} userId - User ID who owns the repository
   * @param {string} repoId - Repository ID
   * @returns {object} Result with counts of stored chunks
   */
  async storeChunks(chunks, userId, repoId) {
    if (!chunks || chunks.length === 0) {
      this.logger.warn('No chunks provided to store');
      return { success: true, stored: 0, skipped: 0 };
    }

    try {
      const pool = await this.postgresAdapter.getPool();
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        let stored = 0;
        let skipped = 0;

        for (const chunk of chunks) {
          try {
            const filePath = chunk.metadata?.source || chunk.metadata?.filePath || 'unknown';
            const content = chunk.pageContent || '';
            
            // Skip empty content
            if (!content || content.trim().length === 0) {
              skipped++;
              continue;
            }

            // Extract file extension
            const fileExtension = filePath.split('.').pop() || 'unknown';

            // Use simple INSERT (table may not have unique constraint yet)
            // If it fails due to duplicate, we'll catch and skip it
            const query = `
              INSERT INTO repo_data (
                user_id,
                repo_id,
                file_path,
                file_extension,
                content,
                content_vector,
                language
              )
              VALUES ($1, $2, $3, $4, $5, to_tsvector('english', $3 || ' ' || $5), 'english')
            `;

            await client.query(query, [
              userId,
              repoId,
              filePath,
              fileExtension,
              content
            ]);

            stored++;
          } catch (chunkError) {
            this.logger.error(`Error storing chunk for file ${chunk.metadata?.source}:`, chunkError.message);
            skipped++;
          }
        }

        await client.query('COMMIT');
        
        this.logger.info(`✅ Stored ${stored} chunks to repo_data, skipped ${skipped}`);
        
        return {
          success: true,
          stored,
          skipped,
          total: chunks.length
        };

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      this.logger.error('Error storing chunks to PostgreSQL:', error);
      throw new Error(`Failed to store chunks: ${error.message}`);
    }
  }
}

module.exports = TextSearchService;