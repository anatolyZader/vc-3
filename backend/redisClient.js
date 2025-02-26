// redisClient.js
const Redis = require('ioredis');

const redisClient = new Redis({
  host: '10.24.125.195', // primary endpoint' of gcp memorystore redis instance
  port: 6379, // default,
  connectionTimeout: 1000 
});

module.exports = redisClient;