// healthCheckGCPAdapter.js (in your infrastructure layer)

'use strict';

const { CloudSQL } = require('@google-cloud/sql'); 
const { Redis } = require('@google-cloud/redis');

class HealthCheckGCPAdapter {
  constructor() {
    console.log('HealthCheckGCPAdapter instantiated!');

    // Initialize GCP clients
    this.cloudSQLClient = new CloudSQL();
    this.redisClient = new Redis(); 
  }

  async checkHealth() {
    try {
      // 1. Check Cloud SQL (PostgreSQL) connection
      const dbStatus = await this.checkCloudSQLConnection();

      // 2. Check Redis connection 
      const redisStatus = await this.checkRedisConnection();

      // 3. ... Add other GCP service health checks ...

      return {
        status: 'ok',
        database: dbStatus,
        redis: redisStatus,
        // ... other health check results
      };

    } catch (error) {
      console.error('Health check failed:', error);
      throw new Error('Health check failed');
    }
  }

  async checkCloudSQLConnection() {
    try {
      const [instances] = await this.cloudSQLClient.getInstances();
      const instance = instances.find(instance => instance.name === 'tvice-pg-instance'); 

      if (!instance) {
        throw new Error('Cloud SQL instance not found');
      }

      // PostgreSQL-specific connection check
      await instance.query('SELECT 1'); 
      return 'connected';
    } catch (error) {
      console.error('Error checking Cloud SQL connection:', error);
      throw new Error('Cloud SQL connection failed');
    }
  }

  async checkRedisConnection() {
    try {
      const redisInstance = this.redisClient.instance('tvice-redis-instance'); 
      await redisInstance.ping();
      return 'connected';
    } catch (error) {
      console.error('Error checking Redis connection:', error);
      throw new Error('Redis connection failed');
    }
  }

  // ... Add other health check methods for GCP services ...
}

module.exports = HealthCheckGCPAdapter;