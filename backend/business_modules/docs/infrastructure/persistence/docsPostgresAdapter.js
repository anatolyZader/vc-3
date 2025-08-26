// docsPostgresAdapter.js
'use strict';

const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const IDocsPersistPort = require('../../domain/ports/IDocsPersistPort');

const isLocal = process.env.NODE_ENV !== 'staging'

class DocsPostgresAdapter extends IDocsPersistPort {
  constructor({ cloudSqlConnector }) {
    super();
    this.connector = cloudSqlConnector;

    this.poolPromise = isLocal
      ? this.createLocalPool()
      : this.createCloudSqlPool(cloudSqlConnector);
  }

  async getPool() {
    if (!this.pool) {
      this.pool = await this.poolPromise;
    }
    return this.pool;
  }

  createLocalPool() {
    const config = {
      user: process.env.PG_USER,
      password: process.env.PG_PASSWORD,
      database: process.env.PG_DATABASE,
      host: 'localhost',
      port: 5432,
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

  async persistDocs(userId, repoId, fetchedDocs) {
    const pool = await this.getPool();
    const client = await pool.connect();
    try {
      const query = `
        INSERT INTO docss (repo_id, user_id, docs_data, updated_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (repo_id)
        DO UPDATE SET docs_data = EXCLUDED.docs_data, updated_at = NOW();
      `;
      await client.query(query, [repoId, userId, fetchedDocs]);
      console.log(`Docs for repo ${repoId} persisted.`);
    } catch (error) {
      console.error('Error persisting docs:', error);
      throw error;
    } finally {
      client.release();
    }
  }

    async readDocs(userId, repoId) {
    const pool = await this.getPool();
    const client = await pool.connect();
    try {
      const query = `
        SELECT docs_data 
        FROM docss 
        WHERE repo_id = $1 AND user_id = $2
        LIMIT 1;
      `;
      const { rows } = await client.query(query, [repoId, userId]);
      return rows.length ? rows[0].docs_data : null;
    } catch (error) {
      console.error('Error reading docs:', error);
      throw error;
    } finally {
      client.release();
    }
  }

    async fetchPage(pageId) {
    throw new Error('Method not implemented.');
  }  

  async createPage(pageTitle) {
    throw new Error('Method not implemented.');
  }

  async updatePage(pageId, newContent) {
    throw new Error('Method not implemented.');
  }

  async deletePage(pageId) {
    throw new Error('Method not implemented.');
  }
}

module.exports = DocsPostgresAdapter;
