// redisClient.js
const Redis = require('ioredis');

const redisClient = new Redis({
  host: '10.224.166.147', // primary endpoint' of my gcp memorystore redis instance
  port: 6379, // default redis port
});

module.exports = redisClient;
