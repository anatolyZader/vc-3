'use strict';
// authPostgresAdapter.js

const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');

const IAuthPersistPort = require('../../domain/ports/IAuthPersistPort');

const isLocal = process.env.ENV === 'development';

class AuthPostgresAdapter extends IAuthPersistPort {
  constructor({ cloudSqlConnector }) {
    super();
    this.connector = cloudSqlConnector;
    const instanceConnectionName = process.env.CLOUD_SQL_CONNECTION_NAME;
    if (!instanceConnectionName) {
      console.error('❌ CLOUD_SQL_CONNECTION_NAME environment variable is not set. Cannot connect to Cloud SQL.');
    }

    const poolConfig = {
      user:     process.env.PG_USER,
      password: process.env.PG_PASSWORD,
      database: process.env.PG_DATABASE,
      host: `localhost`,
      port: 5432,
    };
    console.info('[DB] pgConfig chosen:', poolConfig);

    this.pool = isLocal
      ? new Pool({
          user: poolConfig.user,
          password: poolConfig.password,
          database: poolConfig.database,
          host: poolConfig.host,
          port: poolConfig.port,
          ssl: false,
        })
      : new Pool({
          user: poolConfig.user,
          password: poolConfig.password,
          database: poolConfig.database,
          ssl: false,
          connectionString: undefined,

          Client: class CloudSQLClient extends Pool.Client {
            constructor(config) {
              super(config);
              this.config = config;
              const originalConnect = this.connect.bind(this);
              this.connect = async (callback) => {
                try {
                  const socketPath = await this.config.cloudSqlConnector.getSocket(this.config.instanceConnectionName);
                  this.connectionParameters.host = socketPath;
                  this.connectionParameters.port = undefined;
                  this.connectionParameters.ssl = false;
                  return originalConnect(callback);
                } catch (err) {
                  console.error('Error getting Cloud SQL socket:', err);
                  if (callback) callback(err);
                  throw err;
                }
              };
            }
          },

          cloudSqlConnector: this.connector,
          instanceConnectionName: instanceConnectionName,
        });

    console.info('[DB] pgConfig chosen (after connector setup):', {
      user: poolConfig.user,
      database: poolConfig.database,
      host: instanceConnectionName ? `Cloud SQL Connector via ${instanceConnectionName}` : poolConfig.host,
      port: poolConfig.port,
    });
  }

  async readAllUsers() {
    console.log('this.pool at authPostgresAdapter: ', this.pool);
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query('SELECT * FROM users');
      return rows;
    } catch (error) {
      console.error('Error reading all users:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getUserInfo(email) {
    console.log('Querying user with email:', email);
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query('SELECT * FROM users WHERE email=$1', [email]);
      return rows.length ? rows[0] : null;
    } catch (error) {
      console.error('Error reading user:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async registerUser(username, email, password) {
    const client = await this.pool.connect();
    try {
      const id = uuidv4();
      const existingUser = await client.query('SELECT * FROM users WHERE email = $1', [email]);
      if (existingUser.rows.length > 0) {
        throw new Error('Email already exists');
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      await client.query(
        'INSERT INTO users (id, username, email, password) VALUES ($1, $2, $3, $4)',
        [id, username, email, hashedPassword]
      );
      return { id, username, email };
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async removeUser(email) {
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query('SELECT id FROM users WHERE email = $1', [email]);
      console.log('rows:', rows);
      if (rows.length === 0) {
        console.log('No user found with the given email');
        return false;
      }
      const deleteResult = await client.query('DELETE FROM users WHERE email = $1', [email]);
      console.log(`User deleted: ${deleteResult.rowCount > 0}`);
      return deleteResult.rowCount > 0;
    } catch (error) {
      console.error('Error removing user:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = AuthPostgresAdapter;
