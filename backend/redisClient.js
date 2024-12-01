// redisClient.js
const Redis = require('ioredis');

const redisClient = new Redis({
  host: '10.31.224.155', // primary endpoint' of gcp memorystore redis instance
  port: 6379, // default,
  connectionTimeout: 1000 
});

module.exports = redisClient;