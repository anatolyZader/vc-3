// Quick test for PostgreSQL and Redis connections
require('dotenv').config();
const { Client } = require('pg');
const Redis = require('ioredis');

async function testPostgres() {
  console.log('Testing PostgreSQL connection...');
  const client = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: process.env.DATABASE_PORT || 5432,
    database: process.env.DATABASE_NAME || 'eventstorm_db',
    user: process.env.DATABASE_USER || 'eventstorm_user',
    password: process.env.DATABASE_PASSWORD || 'local_dev_password'
  });
  
  try {
    await client.connect();
    const res = await client.query('SELECT NOW() as time, version() as version');
    console.log('✅ PostgreSQL connected!');
    console.log('   Time:', res.rows[0].time);
    console.log('   Version:', res.rows[0].version.split(' ')[0], res.rows[0].version.split(' ')[1]);
    await client.end();
    return true;
  } catch (err) {
    console.error('❌ PostgreSQL error:', err.message);
    return false;
  }
}

async function testRedis() {
  console.log('\nTesting Redis connection...');
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  });
  
  try {
    await redis.set('test_key', 'test_value');
    const value = await redis.get('test_key');
    await redis.del('test_key');
    console.log('✅ Redis connected!');
    console.log('   Test write/read: SUCCESS');
    redis.disconnect();
    return true;
  } catch (err) {
    console.error('❌ Redis error:', err.message);
    return false;
  }
}

async function main() {
  console.log('=== Testing Database Connections ===');
  const pgOk = await testPostgres();
  const redisOk = await testRedis();
  
  console.log('\n=== Results ===');
  if (pgOk && redisOk) {
    console.log('🎉 All connections successful!');
    process.exit(0);
  } else {
    console.log('⚠️  Some connections failed');
    process.exit(1);
  }
}

main();
