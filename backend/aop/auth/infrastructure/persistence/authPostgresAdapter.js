const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const IAuthPersistPort = require('../../domain/ports/IAuthPersistPort');

class AuthPostgresAdapter extends IAuthPersistPort {
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

  async createUser(username, email, password) {
    const client = await this.pool.connect();
    try {
      const id = uuidv4();
      await client.query('INSERT INTO users (id, username, email, password) VALUES ($1, $2, $3, $4)', [id, username, email, password]);
    } finally {
      client.release();
    }
  }

  async readUser(username) {
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query('SELECT * FROM users WHERE username=$1', [username]);
      return rows.length ? rows[0] : null;
    } finally {
      client.release();
    }
  }

  async removeUser(username) {
    const client = await this.pool.connect();
    try {
      await client.query('DELETE FROM users WHERE username=$1', [username]);
    } finally {
      client.release();
    }
  }

  async readUsers() {
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query('SELECT * FROM users');
      return rows;
    } finally {
      client.release();
    }
  }
}

module.exports = AuthPostgresAdapter;
