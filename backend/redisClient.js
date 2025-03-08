// redisClient.js
const Redis = require('ioredis');

const redisClient = new Redis({
  host: '10.236.130.219', // primary endpoint
  port: 6379,
  connectionTimeout: 1000 
});

module.exports = redisClient;