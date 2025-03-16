// redisClient.js
const Redis = require('ioredis');

const redisClient = new Redis({
  host: '10.171.108.67', 
  port: 6379,
  connectionTimeout: 1000 
});

module.exports = redisClient;