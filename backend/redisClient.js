// redisClient.js
const Redis = require('ioredis');

const redisClient = new Redis({
  host: '10.6.8.35', // primary endpoint
  port: 6379,
  connectionTimeout: 1000 
});

module.exports = redisClient;