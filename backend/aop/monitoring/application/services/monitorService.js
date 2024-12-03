'use strict';
const healthCheckGCPAdapter = require('../../infrastructure/healthCheckGCPAdapter')

class MonitorService {
  constructor({ healthCheckGCPAdapter }) {
    console.log('MonitorService instantiated!');
    this.healthCheckGCPAdapter = healthCheckGCPAdapter;
  }

  async checkHealth() {
    try {
      console.log('Performing health check...');
      const healthStatus = await this.healthCheckGCPAdapter.checkHealth();
      return healthStatus;
    } catch (error) {
      console.error('Error during health check:', error);
      throw error;
    }
  }
}

module.exports = MonitorService;
