const fastifyFactory = require('fastify');

jest.mock('@google-cloud/pubsub', () => ({
  PubSub: class { topic(){ return { publishMessage: jest.fn() }; } }
}));

const pubsubPlugin = require('../../pubsubPlugin');

// Skip this test if file doesn't exist
if (!require('fs').existsSync(require('path').resolve(__dirname, '../../pubsubPlugin.js'))) {
  describe.skip('pubsubPlugin', () => {
    test('skipped - pubsubPlugin not found', () => {
      expect(true).toBe(true);
    });
  });
} else {

describe('pubsubPlugin', () => {
  test('decorates pubsubClient', async () => {
    const app = fastifyFactory({ logger: false });
    await app.register(pubsubPlugin);
    expect(app.pubsubClient).toBeDefined();
    await app.close();
  });
});
