const fastifyFactory = require('fastify');
const logPlugin = require('../../logPlugin');
const { logOptions } = require('../../logPlugin');

describe('logPlugin', () => {
  test('registers hooks and error handler', async () => {
    const app = fastifyFactory({ logger: false });
    await app.register(logPlugin, {});
    // simulate request to trigger onResponse hook
    app.get('/ping', async (req, reply) => { return { ok: true }; });
    const res = await app.inject({ method: 'GET', url: '/ping' });
    expect(res.statusCode).toBe(200);
    expect(logOptions).toHaveProperty('level');
    await app.close();
  });

  test('custom error handler returns 403 for validation errors', async () => {
    const app = fastifyFactory({ logger: false });
    await app.register(logPlugin, {});
    app.post('/val', { schema: { body: { type: 'object', required: ['x'], properties: { x: { type: 'string' } } } } }, (req, reply) => reply.send({}));
    const res = await app.inject({ method: 'POST', url: '/val', payload: {} });
    expect(res.statusCode).toBe(403);
    await app.close();
  });
});
