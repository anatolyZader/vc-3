// aiPostgresAdapter.js
'use strict';
const { Pool } = require('pg');
const IAuthPersistPort = require('../../domain/ports/IAIPersistPort');
const IAIPersistPort = require('../../domain/ports/IAIPersistPort');

class AIPostgresAdapter extends IAIPersistPort{
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
  }

async saveGitData(userId, repoId, content) {
    const client = await this.pool.connect(); // Acquire a client from the pool
    try {
      const query = `
        INSERT INTO git_data (user_id, repo_id, content)
        VALUES ($1, $2, $3)
        RETURNING id;
      `;
      const values = [userId, repoId, content];
      const result = await client.query(query, values); // Use the acquired client
      console.log(`Git data stored with ID: ${result.rows[0].id}`);
      return result.rows[0].id; // Often useful to return the new ID
    } catch (error) {
      console.error('Error saving Git data:', error);
      throw error;
    } finally {
      client.release(); // Release the client back to the pool
    }
  }

  // Save Wiki data
  async saveWikiData(userId, repoId, content) {
    const client = await this.pool.connect(); // Acquire a client from the pool
    try {
      const query = `
        INSERT INTO wiki_data (user_id, repo_id, content)
        VALUES ($1, $2, $3)
        RETURNING id;
      `;
      const values = [userId, repoId, content];
      const result = await client.query(query, values); // Use the acquired client
      console.log(`Wiki data stored with ID: ${result.rows[0].id}`);
      return result.rows[0].id; // Often useful to return the new ID
    } catch (error) {
      console.error('Error saving Wiki data:', error);
      throw error;
    } finally {
      client.release(); // Release the client back to the pool
    }
  }

  // Save AI-generated response
  async saveAiResponse({ userId, conversationId, repoId, prompt, response }) {
    const client = await this.pool.connect(); // Acquire a client from the pool
    try {
      const query = `
        INSERT INTO ai_responses (user_id, conversation_id, repo_id, prompt, response)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id;
      `;
      const values = [userId, conversationId, repoId, prompt, response];
      const result = await client.query(query, values); // Use the acquired client
      console.log(`AI response stored with ID: ${result.rows[0].id}`);
      return result.rows[0].id; // Often useful to return the new ID
    } catch (error) {
      console.error('Error saving AI response:', error);
      throw error;
    } finally {
      client.release(); // Release the client back to the pool
    }
  }

  // Retrieve AI responses for a conversation
  async getAiResponses(conversationId) {
    const client = await this.pool.connect(); // Acquire a client from the pool
    try {
      const query = `SELECT * FROM ai_responses WHERE conversation_id = $1 ORDER BY created_at DESC;`;
      const result = await client.query(query, [conversationId]); // Use the acquired client
      return result.rows;
    } catch (error) {
      console.error('Error retrieving AI responses:', error);
      throw error;
    } finally {
      client.release(); // Release the client back to the pool
    }
  }
}

module.exports = AIPostgresAdapter;