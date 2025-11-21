const fastifyFactory = require('fastify');
const redisPlugin = require('../../redisPlugin');

describe('redisPlugin', () => {
  test('registers redis client (mock env)', async () => {
    const app = fastifyFactory({ logger: false });
    app.decorate('secrets', { REDIS_HOST: 'localhost', REDIS_PORT: 6379 });
    // mock fastify-redis by intercepting register
    const originalRegister = app.register.bind(app);
    app.register = (plugin, opts) => {
      if (plugin.name === 'fastifyRedis') {
        // simulate decoration
        app.decorate('redis', { get: jest.fn(), set: jest.fn() });
        return app; 
      }
      return originalRegister(plugin, opts);
    };
    await app.register(redisPlugin);
    expect(app.redis).toBeDefined();
    await app.close();
  });
});
