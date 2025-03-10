// redisClient.js
const Redis = require('ioredis');

const redisClient = new Redis({
  host: '10.138.16.3', // primary endpoint
  port: 6379,
  connectionTimeout: 1000 
});

module.exports = redisClient;