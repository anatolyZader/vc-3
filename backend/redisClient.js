// redisClient.js

const Redis = require('ioredis');

const redisClient = new Redis({
  host: '10.149.41.35', 
  port: 6379,
  connectionTimeout: 1000 
});

module.exports = redisClient;                     


