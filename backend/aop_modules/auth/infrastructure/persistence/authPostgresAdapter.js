'use strict';
// authPostgresAdapter.js

const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');

const IAuthPersistPort = require('../../domain/ports/IAuthPersistPort');

class AuthPostgresAdapter extends IAuthPersistPort {
  // i Cloud SQL Connector, allows connections via a Unix socket for secure and efficient communication within Google Cloud environments (like Cloud Run or App Engine).
  constructor({ cloudSqlConnector }) {
    super();
    this.connector = cloudSqlConnector;
    const instanceConnectionName = process.env.CLOUD_SQL_CONNECTION_NAME;
    if (!instanceConnectionName) {
      console.error('❌ CLOUD_SQL_CONNECTION_NAME environment variable is not set. Cannot connect to Cloud SQL.');
      // In a production app, you might want to throw an error or handle this more gracefully.
      // For now, we'll proceed with a fallback, but it's important for Cloud Run.
    }

    const poolConfig = {
      user:     process.env.PG_USER,
      password: process.env.PG_PASSWORD,
      database: process.env.PG_DATABASE,
      host: `localhost`, // Connector creates a local proxy, so connect to localhost
      port: 5432, // Connector typically proxies to default PostgreSQL port
     
    };
    console.info('[DB] pgConfig chosen:', poolConfig);   
      this.pool = new Pool({
      user: poolConfig.user,
      password: poolConfig.password,
      database: poolConfig.database,
      ssl: false, // Cloud SQL Connector handles encryption, so no SSL needed for pg client
      connectionString: undefined, // Always undefined, as we always use the custom client factory

      Client: class CloudSQLClient extends Pool.Client { // Always use the custom client
            constructor(config) {
              super(config);
              this.config = config; // Store config for potential reuse

              // Override the connect method to use the connector's socket
              const originalConnect = this.connect.bind(this);
              this.connect = async (callback) => {
                try {
                  // Use the injected connector from the config
                  const socketPath = await this.config.cloudSqlConnector.getSocket(this.config.instanceConnectionName);
                  // Modify the config to use the socketPath
                  this.connectionParameters.host = socketPath;
                  this.connectionParameters.port = undefined; // No port when using socketPath
                  this.connectionParameters.ssl = false; // Connector handles SSL
                  // Setting connectionString: undefined and ssl: false when using the CloudSQLClient is generally correct as the connector handles the actual connection. 

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

      // Check for duplicate email
      const existingUser = await client.query('SELECT * FROM users WHERE email = $1', [email]);
      if (existingUser.rows.length > 0) {
        throw new Error('Email already exists');
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      // Use plain-text password
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
