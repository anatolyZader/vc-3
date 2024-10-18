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
    try {
      const connector = new Connector();

      // Obtain client configuration options from the connector
      const clientConfig = await connector.getOptions({
        instanceConnectionName: process.env.CLOUD_SQL_CONNECTION_NAME,
        ipType: 'PUBLIC', // Use 'PRIVATE' if connecting over private IP
      });

      // Create a new pool with the client configuration
      this.pool = new Pool({
        ...clientConfig, // Spread the client configuration options
        user: process.env.PG_USER,
        password: process.env.PG_PASSWORD,
        database: process.env.PG_DATABASE,
      });

      console.log('PostgreSQL connection pool initialized successfully.');
    } catch (error) {
      console.error('Error initializing connection pool:', error);
      throw error;
    }
  }

  async readAllUsers() {
    console.log('hello from authPostgresAdapter/readAllUsers!');
    let client;
    try {
      client = await this.pool.connect();
      console.log('client in!');
      const { rows } = await client.query('SELECT * FROM users');
      return rows;
    } catch (error) {
      console.error('Error executing readAllUsers query:', error.message, error.stack);
      throw error;
    } finally {
      if (client) client.release();
    }
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


  async removeUser(username, password) {
    const client = await this.pool.connect();
    try {
      const sql = 'DELETE FROM users WHERE username=$1 AND password=$2';
      await client.query(sql, [username, password]);
    } finally {
      client.release();
    }
  }

  async readUser(username) {
    console.log('hello from authPostgresAdapter/readUser!')
    const client = await this.pool.connect();
    console.log("client in!")
    try {
      const { rows } = await client.query('SELECT * FROM users WHERE username=$1', [username]);
      return rows.length ? rows[0] : null;
    } finally {
      client.release();
    }
  }





// -------------------------------------------------------------------------------





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
