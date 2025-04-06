// redisClient.js

const Redis = require('ioredis');

const redisClient = new Redis({
  host: '10.63.252.203', 
  port: 6379,
  connectionTimeout: 1000 
});

module.exports = redisClient;                     


