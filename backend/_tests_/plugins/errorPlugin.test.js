const fastifyFactory = require('fastify');
const errorPlugin = require('../../errorPlugin');

describe('errorPlugin', () => {
  test('wraps 500 errors with generic message', async () => {
    const app = fastifyFactory({ logger: false });
    await app.register(errorPlugin);
    app.get('/boom', () => { const e = new Error('hidden'); e.statusCode = 500; throw e; });
    const res = await app.inject({ method: 'GET', url: '/boom' });
    expect(res.statusCode).toBe(500);
    const body = JSON.parse(res.payload);
    expect(body.error).toBe('Internal Server Error');
    await app.close();
  });

  test('returns validation 400', async () => {
    const app = fastifyFactory({ logger: false });
    await app.register(errorPlugin);
    app.post('/val', { schema: { body: { type: 'object', required: ['x'], properties: { x: { type: 'string' } } } } }, () => ({}));
    const res = await app.inject({ method: 'POST', url: '/val', payload: {} });
    expect(res.statusCode).toBe(400);
    await app.close();
  });
});
