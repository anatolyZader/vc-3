const fastifyFactory = require('fastify');
const corsPlugin = require('../../corsPlugin');

describe('corsPlugin', () => {
  test('registers CORS with expected origins', async () => {
    const app = fastifyFactory({ logger: false });
    await app.register(corsPlugin);
    // Fastify doesn't expose CORS config directly; simply ensure route works and headers set
    app.get('/t', async () => ({ ok: true }));
    const res = await app.inject({ method: 'GET', url: '/t', headers: { origin: 'http://localhost:5173' } });
    expect(res.statusCode).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    await app.close();
  });
});
