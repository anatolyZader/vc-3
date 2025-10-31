// aiPostgresAdapter.js
'use strict';
const { Pool } = require('pg');
const IAIPersistPort = require('../../domain/ports/IAIPersistPort');

const isLocal = process.env.NODE_ENV !== 'staging';

class AIPostgresAdapter extends IAIPersistPort {
  constructor({ cloudSqlConnector }) {
      super();
      this.connector = cloudSqlConnector;
      this.pool = null;
      this.poolPromise = null;
  }

  async initPool() {
    try {
      // Ensure a pool and promise exist
      const pool = await this.getPool();
      this.pool = pool;
      console.log('✅ Database pool initialized successfully');
      return this.pool;
    } catch (error) {
      console.error('❌ Error initializing database pool:', error);
      throw error;
    }
  }

  async getPool() {
    if (this.pool) return this.pool;
    try {
      if (!this.poolPromise) {
        this.poolPromise = isLocal
          ? Promise.resolve(this.createLocalPool())
          : this.createCloudSqlPool(this.connector);
      }
      this.pool = await this.poolPromise;
      return this.pool;
    } catch (error) {
      console.error('❌ Failed to get pool:', error);
      throw new Error(`Database connection error: ${error.message}`);
    }
  }

  createLocalPool() {
    const config = {
      host: process.env.PG_HOST || '127.0.0.1',
      port: Number(process.env.PG_PORT || 5432),
      user: process.env.PG_USER,
      password: process.env.PG_PASSWORD,
      database: process.env.PG_DATABASE,
      ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    };
    console.info('[DB] Using local Postgres config (AI) host:', config.host, 'db:', config.database);
    return new Pool(config);
  }

  async createCloudSqlPool(connector) {
      try {
          const instanceConnectionName = process.env.CLOUD_SQL_CONNECTION_NAME;
          if (!instanceConnectionName) {
              throw new Error('❌ CLOUD_SQL_CONNECTION_NAME environment variable is not set. Cannot connect to Cloud SQL.');
          }

          const clientOpts = await connector.getOptions({
              instanceConnectionName,
              ipType: 'PRIVATE',
              authType: 'ADC',
          });

          const config = {
              ...clientOpts,
              user: process.env.PG_USER,
              password: process.env.PG_PASSWORD,
              database: process.env.PG_DATABASE,
          };

          console.info('[DB] Using Cloud SQL config (AI) for:', instanceConnectionName);
          return new Pool(config);
      } catch (error) {
          console.error('❌ Error creating Cloud SQL pool:', error);
          throw error;
      }
  }

  async saveGitData(userId, repoId, content) {
    try {
      const pool = await this.getPool(); // Get initialized pool
      const client = await pool.connect();
      try {
        const query = `
          INSERT INTO git_data (user_id, repo_id, content)
          VALUES ($1, $2, $3)
          RETURNING id;
        `;
        const values = [userId, repoId, content];
        const result = await client.query(query, values);
        console.log(`Git data stored with ID: ${result.rows[0].id}`);
        return result.rows[0].id;
      } catch (error) {
        console.error('Error saving Git data:', error);
        throw error;
      } finally {
        client.release();
      }
    } catch (poolError) {
      console.error('Database connection error in saveGitData:', poolError);
      // Return a default value instead of throwing
      return null;
    }
  }

  // Save Docs data
  async saveDocsData(userId, repoId, content) {
    try {
      const pool = await this.getPool(); // Get initialized pool
      const client = await pool.connect();
      try {
        const query = `
          INSERT INTO docs_data (user_id, repo_id, content)
          VALUES ($1, $2, $3)
          RETURNING id;
        `;
        const values = [userId, repoId, content];
        const result = await client.query(query, values);
        console.log(`Docs data stored with ID: ${result.rows[0].id}`);
        return result.rows[0].id;
      } catch (error) {
        console.error('Error saving Docs data:', error);
        throw error;
      } finally {
        client.release();
      }
    } catch (poolError) {
      console.error('Database connection error in saveDocsData:', poolError);
      // Return a default value instead of throwing
      return null;
    }
  }

  // Save AI-generated response
  async saveAiResponse({ userId, conversationId, repoId, prompt, response }) {
    try {
      const pool = await this.getPool(); // Get initialized pool
      const client = await pool.connect();
      try {
        const query = `
          INSERT INTO ai.ai_responses (user_id, conversation_id, repo_id, prompt, response)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id;
        `;
        const values = [userId, conversationId, repoId, prompt, response];
        const result = await client.query(query, values);
        console.log(`AI response stored with ID: ${result.rows[0].id}`);
        return result.rows[0].id;
      } catch (error) {
        console.error('Error saving AI response:', error);
        throw error;
      } finally {
        client.release();
      }
    } catch (poolError) {
      console.error('Database connection error in saveAiResponse:', poolError);
      // Return a default value instead of throwing
      return null;
    }
  }

  // Retrieve AI responses for a conversation
  async getAiResponses(conversationId) {
    try {
      const pool = await this.getPool(); // Get initialized pool
      const client = await pool.connect();
      try {
        const query = `SELECT * FROM ai.ai_responses WHERE conversation_id = $1 ORDER BY created_at DESC;`;
        const result = await client.query(query, [conversationId]);
        return result.rows;
      } catch (error) {
        console.error('Error retrieving AI responses:', error);
        throw error;
      } finally {
        client.release();
      }
    } catch (poolError) {
      console.error('Database connection error in getAiResponses:', poolError);
      // Return empty array instead of throwing
      return [];
    }
  }

  // Retrieve conversation history for context (ordered chronologically)
  async getConversationHistory(conversationId, limit = 10) {
    try {
      const pool = await this.getPool(); // Get initialized pool
      const client = await pool.connect();
      try {
        const query = `
          SELECT prompt, response, created_at 
          FROM ai.ai_responses 
          WHERE conversation_id = $1 
          ORDER BY created_at ASC 
          LIMIT $2;
        `;
        const result = await client.query(query, [conversationId, limit]);
        return result.rows.map(row => ({
          prompt: row.prompt,
          response: row.response,
          timestamp: row.created_at
        }));
      } catch (error) {
        console.error('Error retrieving conversation history:', error);
        throw error;
      } finally {
        client.release();
      }
    } catch (poolError) {
      console.error('Database connection error in getConversationHistory:', poolError);
      // Return empty array instead of throwing
      return [];
    }
  }

  /**
   * Store document chunks to repo_data table for full-text search
   * SYNCHRONIZED CHUNKING: Stores the same chunks as Pinecone with rich metadata
   * @param {Array} chunks - Array of document chunks with pageContent and metadata
   * @param {string} userId - User ID who owns the repository
   * @param {string} repoId - Repository ID
   * @param {object} options - Storage options
   * @returns {object} Result with counts of stored chunks
   */
  async storeRepoChunks(chunks, userId, repoId, options = {}) {
    if (!chunks || chunks.length === 0) {
      console.warn('No chunks provided to store');
      return { success: true, stored: 0, skipped: 0 };
    }

    const { includeMetadata = true } = options;

    try {
      const pool = await this.getPool();
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        let stored = 0;
        let skipped = 0;
        let updated = 0;

        for (const chunk of chunks) {
          try {
            const filePath = chunk.metadata?.source || chunk.metadata?.filePath || 'unknown';
            const content = chunk.pageContent || '';
            
            // Skip empty content
            if (!content || content.trim().length === 0) {
              skipped++;
              continue;
            }

            // Extract chunk index (default to 0 for non-chunked files)
            const chunkIndex = chunk.metadata?.chunkIndex ?? 0;
            
            // Extract file extension
            const fileExtension = filePath.split('.').pop() || 'unknown';
            
            // Estimate token count (rough: 1 token ≈ 4 characters)
            const chunkTokens = chunk.metadata?.chunkTokens || Math.ceil(content.length / 4);

            // Build rich metadata object matching Pinecone structure
            const metadata = includeMetadata ? {
              semantic_tags: chunk.metadata?.semantic_tags || chunk.metadata?.semanticTags || [],
              ubiquitous_language: chunk.metadata?.ubiquitous_language || chunk.metadata?.ubiquitousLanguage || [],
              domain_concepts: chunk.metadata?.domain_concepts || chunk.metadata?.domainConcepts || [],
              function_names: chunk.metadata?.function_names || chunk.metadata?.functionNames || [],
              class_names: chunk.metadata?.class_names || chunk.metadata?.classNames || [],
              type: chunk.metadata?.type || 'github-code',
              branch: chunk.metadata?.branch || 'main',
              commit_sha: chunk.metadata?.commit_sha || chunk.metadata?.sha || null,
              processed_at: chunk.metadata?.processedAt || new Date().toISOString(),
              repo_url: chunk.metadata?.repoUrl || chunk.metadata?.repository || null,
              file_type: chunk.metadata?.fileType || fileExtension,
              // Preserve any additional metadata
              ...(chunk.metadata?.additionalMetadata || {})
            } : {};

            // Insert or update chunk with UPSERT
            const query = `
              INSERT INTO ai.repo_data (
                user_id,
                repo_id,
                file_path,
                file_extension,
                chunk_index,
                chunk_content,
                chunk_tokens,
                metadata,
                language
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
              ON CONFLICT (user_id, repo_id, file_path, chunk_index) 
              DO UPDATE SET
                chunk_content = EXCLUDED.chunk_content,
                chunk_tokens = EXCLUDED.chunk_tokens,
                metadata = EXCLUDED.metadata,
                file_extension = EXCLUDED.file_extension,
                updated_at = CURRENT_TIMESTAMP
              RETURNING (xmax = 0) AS inserted;
            `;

            const result = await client.query(query, [
              userId,
              repoId,
              filePath,
              fileExtension,
              chunkIndex,
              content,
              chunkTokens,
              JSON.stringify(metadata),
              'english'
            ]);

            if (result.rows[0].inserted) {
              stored++;
            } else {
              updated++;
            }

          } catch (chunkError) {
            console.error(`Error storing chunk for file ${chunk.metadata?.source} [chunk ${chunk.metadata?.chunkIndex || 0}]:`, chunkError.message);
            skipped++;
          }
        }

        await client.query('COMMIT');
        
        console.log(`✅ PostgreSQL sync: ${stored} new, ${updated} updated, ${skipped} skipped (total: ${chunks.length})`);
        
        return {
          success: true,
          stored,
          updated,
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
      console.error('Error storing chunks to PostgreSQL:', error);
      throw new Error(`Failed to store chunks: ${error.message}`);
    }
  }
}

module.exports = AIPostgresAdapter;