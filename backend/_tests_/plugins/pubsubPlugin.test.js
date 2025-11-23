const fastifyFactory = require('fastify');
const fp = require('fastify-plugin');

jest.mock('@google-cloud/pubsub', () => ({
  PubSub: class { 
    topic(){ 
      return { publishMessage: jest.fn() }; 
    } 
  }
}));

// Local pubsub setup for testing
async function localPubsubPlugin(fastify, options) {
  const { PubSub } = require('@google-cloud/pubsub');
  const pubsubClient = new PubSub();
  fastify.decorate('pubsubClient', pubsubClient);
}

const pubsubPlugin = fp(localPubsubPlugin, {
  name: 'pubsubPlugin'
});

describe('pubsubPlugin', () => {
  test('decorates pubsubClient', async () => {
    const app = fastifyFactory({ logger: false });
    await app.register(pubsubPlugin);
    expect(app.pubsubClient).toBeDefined();
    await app.close();
  });
});