const fastifyFactory = require('fastify');
const envPlugin = require('../../envPlugin');

// Minimal schema injection mimic
const dotenvSchema = {
  type: 'object',
  required: [],
  properties: {
    PG_USER: { type: 'string' }
  }
};

describe('envPlugin', () => {
  test('registers fastifyEnv with provided schema', async () => {
    const app = fastifyFactory({ logger: false });
    app.addSchema({ $id: 'schema:dotenv', ...dotenvSchema });
    process.env.PG_USER = 'tester';
    await app.register(envPlugin);
    expect(app.secrets).toBeDefined();
    await app.close();
  });
});
