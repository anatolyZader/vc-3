// redisClient.js

const Redis = require('ioredis');

const redisClient = new Redis({
  host: '10.121.178.171', 
  port: 6379,
  connectionTimeout: 1000 
});

module.exports = redisClient;                     


