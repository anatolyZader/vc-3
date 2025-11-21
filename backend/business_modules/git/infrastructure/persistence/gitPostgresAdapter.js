// gitPostgresAdapter.js
'use strict';

const { Pool } = require('pg');
const IGitPersistPort = require('../../domain/ports/IGitPersistPort');
const { getDbConfig, getEnvironmentInfo } = require('../../../../config/dbConfig');

const envInfo = getEnvironmentInfo();

class GitPostgresAdapter extends IGitPersistPort {
  constructor({ cloudSqlConnector }) {
    super();
    this.connector = cloudSqlConnector;
    this.poolPromise = envInfo.isLocal
      ? this.createLocalPool()
      : this.createCloudSqlPool(cloudSqlConnector);
  }

  async getPool() {
    if (!this.pool) {
      this.pool = await this.poolPromise;
    }
    return this.pool;
  }

  async createLocalPool() {
    const dbConfig = await getDbConfig();
    const config = {
      user: process.env.PG_USER,
      password: process.env.PG_PASSWORD,
      database: process.env.PG_DATABASE,
      host: dbConfig.host,
      port: dbConfig.port,
      ssl: dbConfig.ssl,
      max: dbConfig.maxConnections,
    };
    return Promise.resolve(new Pool(config));
  }

  async createCloudSqlPool(connector) {
    const instanceConnectionName = process.env.CLOUD_SQL_CONNECTION_NAME;
    if (!instanceConnectionName) {
      throw new Error('❌ CLOUD_SQL_CONNECTION_NAME env var not set.');
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

    console.info('[DB] Using Cloud SQL config for:', instanceConnectionName);
    return new Pool(config);
  }

  // ✅ Fixed method name and added git schema
  async persistRepo(userId, repoId, repo) {    
    const pool = await this.getPool();
    const client = await pool.connect();
    try {
      console.log(`[DB] Attempting to persist repo: ${repoId} for user: ${userId}`);
      
      const query = `
        INSERT INTO git.repositories (user_id, repo_id, data, created_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (user_id, repo_id) 
        DO UPDATE SET data = $3, updated_at = NOW()
      `;
      
      // Ensure repo is a JSON object
      const jsonData = JSON.stringify(repo);
      console.log(`[DB] Query: ${query}`);
      console.log(`[DB] Parameters: userId=${userId}, repoId=${repoId}, dataLength=${jsonData.length}`);
      
      const result = await client.query(query, [userId, repoId, jsonData]);
      console.log(`[DB] ✅ Repository persisted successfully: ${repoId} for user: ${userId}`);
      console.log(`[DB] Query result:`, result.rowCount, 'rows affected');
      
    } catch (error) {
      console.error(`[DB] ❌ Error persisting repo:`, {
        message: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        position: error.position,
        severity: error.severity,
        userId,
        repoId,
        stack: error.stack
      });
      throw error;
    } finally {
      client.release();
    }
  }

  // ✅ Fixed method name and added git schema  
  async persistDocs(userId, repoId, docs) {
    const pool = await this.getPool();
    const client = await pool.connect();
    try {
      console.log(`[DB] Attempting to persist docs: ${repoId} for user: ${userId}`);
      
      const query = `
        INSERT INTO git.docss (user_id, repo_id, data, created_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (user_id, repo_id)
        DO UPDATE SET data = $3, updated_at = NOW()
      `;
      
      console.log(`[DB] Query: ${query}`);
      console.log(`[DB] Parameters: userId=${userId}, repoId=${repoId}, docsSize=${docs ? docs.length : 'null'}`);
      
      const result = await client.query(query, [userId, repoId, docs]);
      console.log(`[DB] ✅ Docs persisted successfully: ${repoId} for user: ${userId}`);
      console.log(`[DB] Query result:`, result.rowCount, 'rows affected');
      
    } catch (error) {
      console.error(`[DB] ❌ Error persisting docs:`, {
        message: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        position: error.position,
        severity: error.severity,
        userId,
        repoId,
        stack: error.stack
      });
      throw error;
    } finally {
      client.release();
    }
  }

  // ✅ Get repository for existence checking (used by persistRepo)
  async getRepo(userId, repoId) {
    const pool = await this.getPool();
    const client = await pool.connect();
    try {
      console.log(`[DB] Attempting to get repo: ${repoId} for user: ${userId}`);
      
      const query = `
        SELECT user_id, repo_id, data, created_at, updated_at
        FROM git.repositories 
        WHERE user_id = $1 AND repo_id = $2
      `;
      
      console.log(`[DB] Query: ${query}`);
      console.log(`[DB] Parameters: userId=${userId}, repoId=${repoId}`);
      
      const result = await client.query(query, [userId, repoId]);
      
      if (result.rows.length === 0) {
        console.log(`[DB] ℹ️ Repository not found: ${repoId} for user: ${userId}`);
        throw new Error(`Repository ${repoId} does not exist for user ${userId}`);
      }
      
      console.log(`[DB] ✅ Repository found: ${repoId} for user: ${userId}`);
      return result.rows[0];
      
    } catch (error) {
      if (error.message.includes('does not exist')) {
        // Re-throw "not found" errors for service layer handling
        throw error;
      }
      
      console.error(`[DB] ❌ Error getting repo:`, {
        message: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        position: error.position,
        severity: error.severity,
        userId,
        repoId,
        stack: error.stack
      });
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = GitPostgresAdapter;