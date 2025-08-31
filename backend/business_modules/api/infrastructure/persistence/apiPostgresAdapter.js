// apiPostgresAdapter.js

'use strict';

const { Pool } = require('pg');
const IApiPersistPort = require('../../domain/ports/IApiPersistPort');
const UserId = require('../../domain/value_objects/userId');
const RepoId = require('../../domain/value_objects/repoId');
const HttpApiSpec = require('../../domain/value_objects/httpApiSpec');

const isLocal = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';

class ApiPostgresAdapter extends IApiPersistPort {
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

  async saveHttpApi(userId, repoId, httpApi) {
    const userIdVO = new UserId(userId);
    const repoIdVO = new RepoId(repoId);
    const specVO = new HttpApiSpec(httpApi);
    const pool = await this.getPool();
    const client = await pool.connect();
    try {
      const specJson = JSON.stringify(specVO.spec);
      const queryText = `
        INSERT INTO http_api (user_id, repo_id, spec, updated_at)
        VALUES ($1, $2, $3::jsonb, NOW())
        ON CONFLICT (user_id, repo_id)
        DO UPDATE SET
        spec = EXCLUDED.spec,
        updated_at = NOW();
      `;
      const queryValues = [userIdVO.value, repoIdVO.value, specJson];
      await client.query(queryText, queryValues);
      console.log(`[DB] HTTP API saved/updated for user_id='${userIdVO.value}', repo_id='${repoIdVO.value}'`);
    } catch (error) {
      console.error('Error saving http api:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getHttpApi(userId, repoId) {
    const userIdVO = new UserId(userId);
    const repoIdVO = new RepoId(repoId);
    const pool = await this.getPool();
    const client = await pool.connect();
    try {
      const queryText = `
        SELECT spec
        FROM http_api
        WHERE user_id = $1 AND repo_id = $2
        LIMIT 1;
      `;
      const queryValues = [userIdVO.value, repoIdVO.value];
      const res = await client.query(queryText, queryValues);
      if (res.rows.length === 0) {
        console.log(`[DB] No HTTP API found for user_id='${userIdVO.value}', repo_id='${repoIdVO.value}'`);
        return null;
      }
      const spec = res.rows[0].spec;
      const specVO = new HttpApiSpec(typeof spec === 'string' ? JSON.parse(spec) : spec);
      return specVO.spec;
    } catch (error) {
      console.error('Error fetching http api:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = ApiPostgresAdapter;
