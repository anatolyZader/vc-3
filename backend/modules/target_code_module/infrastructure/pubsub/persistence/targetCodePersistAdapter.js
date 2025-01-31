'use strict';

const { Pool } = require('pg');
const ITargetCodePersistPort = require('../ports/ITargetCodePersistPort');

class TargetCodePostgresAdapter extends ITargetCodePersistPort {
  constructor() {
    super();
    this.pool = new Pool({
      user: process.env.PG_USER,
      password: process.env.PG_PASSWORD,
      database: process.env.PG_DATABASE,
      host: process.env.PG_HOST,
      port: process.env.PG_PORT,
    });
  }

  /**
   * Fetches a target module by ID (placeholder logic).
   */
  async fetchTargetCode(moduleId) {
    const client = await this.pool.connect();
    try {
      console.log(`Fetching target module ${moduleId}.`);
        const { rows } = await client.query('SELECT * FROM target_code WHERE id = $1', [moduleId]);
        return rows.length ? rows[0] : null;
    } catch (error) {
      console.error('Error fetching target module:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = TargetCodePostgresAdapter;
