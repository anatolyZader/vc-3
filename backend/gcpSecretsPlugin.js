// gcpSecretsPlugin.js
// GCP Secret Manager integration for production deployments
'use strict';

const fp = require('fastify-plugin');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

/**
 * GCP Secrets Manager Plugin
 * 
 * Loads secrets from GCP Secret Manager in production environments
 * Falls back to environment variables in local development
 * 
 * Usage:
 * - In production: Secrets are loaded from GCP Secret Manager
 * - In development: Secrets are loaded from .env file or environment variables
 */
async function gcpSecretsPlugin(fastify, opts) {
  const isProduction = process.env.NODE_ENV === 'production';
  const gcpProjectId = process.env.GCP_PROJECT_ID;
  
  fastify.log.info({ isProduction, gcpProjectId }, 'Initializing secrets management');
  
  if (isProduction && gcpProjectId) {
    // Production: Load secrets from GCP Secret Manager
    fastify.log.info('🔐 Loading secrets from GCP Secret Manager...');
    
    const client = new SecretManagerServiceClient();
    
    /**
     * Access a secret from GCP Secret Manager
     * @param {string} secretName - Name of the secret
     * @param {string} version - Version (default: 'latest')
     * @returns {Promise<string>} - Secret value
     */
    const accessSecret = async (secretName, version = 'latest') => {
      try {
        const name = `projects/${gcpProjectId}/secrets/${secretName}/versions/${version}`;
        const [response] = await client.accessSecretVersion({ name });
        const secretValue = response.payload.data.toString('utf8');
        fastify.log.debug({ secretName }, 'Secret loaded from GCP Secret Manager');
        return secretValue;
      } catch (error) {
        fastify.log.error({ secretName, error: error.message }, 'Failed to load secret from GCP Secret Manager');
        throw error;
      }
    };
    
    // Load critical secrets and populate process.env
    try {
      const secretNames = [
        'COOKIE_SECRET',
        'SESSION_SECRET',
        'JWT_SECRET',
        'PG_PASSWORD',
        'GITHUB_TOKEN',
        'OPENAI_API_KEY',
        'ANTHROPIC_API_KEY',
        'GOOGLE_API_KEY',
        'PINECONE_API_KEY',
        'GCP_OAUTH2_CLIENT_SECRET'
      ];
      
      for (const secretName of secretNames) {
        // Only load if not already set (allows env var override)
        if (!process.env[secretName]) {
          try {
            const secretValue = await accessSecret(secretName);
            process.env[secretName] = secretValue;
            fastify.log.info({ secretName }, '✅ Secret loaded');
          } catch (error) {
            // Log but don't fail - some secrets might be optional
            fastify.log.warn({ secretName, error: error.message }, 'Secret not available (may be optional)');
          }
        } else {
          fastify.log.debug({ secretName }, 'Secret already set via environment variable');
        }
      }
      
      fastify.log.info('✅ GCP Secrets loaded successfully');
      
    } catch (error) {
      fastify.log.error({ error }, '❌ Failed to load secrets from GCP Secret Manager');
      throw error;
    }
    
    // Decorate fastify with the secret accessor for runtime secret access
    fastify.decorate('getSecret', accessSecret);
    
  } else {
    // Development: Use environment variables from .env file
    fastify.log.info('🔧 Using environment variables for secrets (local development)');
    
    // Provide a no-op accessor for consistency
    fastify.decorate('getSecret', async (secretName) => {
      return process.env[secretName] || null;
    });
  }
  
  fastify.log.info('✅ Secrets plugin initialized');
}

module.exports = fp(gcpSecretsPlugin, {
  name: 'gcp-secrets',
  dependencies: []
});

