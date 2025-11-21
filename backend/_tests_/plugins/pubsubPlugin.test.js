const fastifyFactory = require('fastify');

jest.mock('@google-cloud/pubsub', () => ({
  PubSub: class { topic(){ return { publishMessage: jest.fn() }; } }
}));

const pubsubPlugin = require('../../pubsubPlugin');

describe('pubsubPlugin', () => {
  test('decorates pubsubClient', async () => {
    const app = fastifyFactory({ logger: false });
    await app.register(pubsubPlugin);
    expect(app.pubsubClient).toBeDefined();
    await app.close();
  });
});
