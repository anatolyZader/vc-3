// dbConfig.js - Centralized database configuration
'use strict';

/**
 * Dynamic database configuration based on environment
 * Supports separate credentials for local development and production
 * Uses same database schema/tables for both environments
 */

const getEnvironmentInfo = () => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  // Determine if we're in local development
  const isLocal = nodeEnv === 'development';
  const isProduction = nodeEnv === 'production';
  
  return {
    nodeEnv,
    isLocal,
    isProduction
  };
};

const getDbConfig = async () => {
  const envInfo = getEnvironmentInfo();
  
  if (envInfo.isLocal) {
    // Local development configuration - native PostgreSQL on port 5433
    return {
      host: process.env.LOCAL_DATABASE_HOST || 'localhost',
      port: parseInt(process.env.LOCAL_DATABASE_PORT || '5433', 10),
      database: process.env.LOCAL_DATABASE_NAME || 'eventstorm_db',
      user: process.env.LOCAL_DATABASE_USER || 'eventstorm_user',
      password: process.env.LOCAL_DATABASE_PASSWORD || 'local_dev_password',
      ssl: false,
      maxConnections: 10,
      connectionTimeoutMillis: 2000,
      idleTimeoutMillis: 30000,
    };
  } else {
    // Production configuration - GCP Cloud SQL via proxy on port 5432
    return {
      host: process.env.PROD_DATABASE_HOST || 'localhost',
      port: parseInt(process.env.PROD_DATABASE_PORT || '5432', 10),
      database: process.env.PROD_DATABASE_NAME || 'eventstorm_db',
      user: process.env.PROD_DATABASE_USER || 'eventstorm_user',
      password: process.env.PROD_DATABASE_PASSWORD || 'production_password',
      ssl: {
        rejectUnauthorized: false
      },
      maxConnections: 20,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
    };
  }
};

// Helper to set legacy environment variables for backwards compatibility
const setLegacyEnvVars = async () => {
  const dbConfig = await getDbConfig();
  
  // Set the legacy PG_* variables that existing code expects
  process.env.PG_USER = dbConfig.user;
  process.env.PG_PASSWORD = dbConfig.password;
  process.env.PG_DATABASE = dbConfig.database;
  process.env.DATABASE_PORT = dbConfig.port.toString();
  
  console.log(`[DB Config] Environment: ${getEnvironmentInfo().isLocal ? 'DEVELOPMENT' : 'PRODUCTION'}`);
  console.log(`[DB Config] Database: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
  console.log(`[DB Config] User: ${dbConfig.user}`);
  console.log(`[DB Config] SSL: ${dbConfig.ssl ? 'enabled' : 'disabled'}`);
};

module.exports = {
  getDbConfig,
  getEnvironmentInfo,
  setLegacyEnvVars
};