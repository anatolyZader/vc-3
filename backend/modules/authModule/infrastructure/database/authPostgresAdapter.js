'strict'
// authPostgresAdapter.js

// TODO

// Hash Passwords: Use a strong password hashing algorithm like bcrypt or Argon2 to hash passwords before storing them in the database.
// Secure Password Storage: Ensure that the password_hash column in the users table is properly protected using a strong encryption algorithm.
// Configuration Management: Use a configuration management tool or environment variables that are securely stored and managed to avoid hardcoding sensitive information.
// Error Handling: Implement proper error handling mechanisms to gracefully handle exceptions and provide informative error messages.
// Security Best Practices: Follow security best practices to protect the application from vulnerabilities and unauthorized access.

const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const { GoogleAuth } = require('google-auth-library');
const { Connector } = require('@google-cloud/cloud-sql-connector');
const IAuthDatabasePort = require('../../domain/ports/IAuthDatabasePort');


class AuthPostgresAdapter extends IAuthDatabasePort {
  constructor() {
    super();
    this.connector = new Connector();
    this.initPool();
  }

  async initPool() {
    const auth = new GoogleAuth({
      scopes: [
        'https://www.googleapis.com/auth/cloud-platform',
        'https://www.googleapis.com/auth/sqlservice.admin'
      ]
    });
    const client = await auth.getClient();
    const token = await client.getAccessToken();

    console.log("PG_USER at authPostgresAdapter.js: ", process.env.PG_USER )

    this.pool = new Pool({
      user: process.env.PG_USER,
      host: "/cloudsql/" + process.env.CLOUD_SQL_CONNECTION_NAME,  // connection string for the Cloud SQL instance
      password: process.env.PG_PASSWORD,
      database: process.env.PG_DATABASE,
      connection: {
        headers: { Authorization: `Bearer ${token.token}` }
      }
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
