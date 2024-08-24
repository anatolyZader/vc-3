'strict'
// authPostgresAdapter.js
const { Pool } = require('pg');
const IAuthDatabasePort = require('../../domain/ports/IAuthDatabasePort');
const { v4: uuidv4 } = require('uuid');

class AuthPostgresAdapter extends IAuthDatabasePort {
  constructor() {
    super();
    this.pool = new Pool({
      connectionString: process.env.PG_CONNECTION_STRING,
    });
  }

  async createUser(username, email, password) {
    const client = await this.pool.connect();
    try {
      const id = uuidv4();
      const sql = 'INSERT INTO users (id, username, email, password) VALUES ($1, $2, $3, $4)';
      await client.query(sql, [id, username, email, password]);
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

  async removeUser(username, passwordHash) {
    const client = await this.pool.connect();
    try {
      const sql = 'DELETE FROM users WHERE username=$1 AND password_hash=$2';
      await client.query(sql, [username, passwordHash]);
    } finally {
      client.release();
    }
  }

  async findUserByUsername(username) {
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query('SELECT * FROM users WHERE username=$1', [username]);
      return rows.length ? rows[0] : null;
    } finally {
      client.release();
    }
  }

  async loginUser(username, passwordHash) {
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query('SELECT * FROM users WHERE username=$1 AND password_hash=$2', [username, passwordHash]);
      if (rows.length) {
        const sessionId = uuidv4();
        await client.query('INSERT INTO sessions (id, user_id) VALUES ($1, $2)', [sessionId, rows[0].id]);
        return { sessionId, user: rows[0] };
      }
      return null;
    } finally {
      client.release();
    }
  }

  async logoutUser(sessionId) {
    const client = await this.pool.connect();
    try {
      await client.query('DELETE FROM sessions WHERE id=$1', [sessionId]);
    } finally {
      client.release();
    }
  }
}

module.exports = AuthPostgresAdapter;
