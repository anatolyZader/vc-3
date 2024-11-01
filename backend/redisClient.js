// redisClient.js
const Redis = require('ioredis');

const redisClient = new Redis({
  host: '10.76.122.147', // primary endpoint' of gcp memorystore redis instance
  port: 6379, // default  
});

module.exports = redisClient;
