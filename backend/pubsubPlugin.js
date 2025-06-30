// pubsubPlugin.js
/* eslint-disable no-unused-vars */
'use strict';
const fp = require('fastify-plugin');
const { PubSub } = require('@google-cloud/pubsub');


module.exports = fp(async function pubsubCPlugin(fastify, opts) {
  const pubsubClient = new PubSub();

  fastify.decorate('pubsubClient', pubsubClient);

  fastify.log.info('✅ PubSub client registered in current scope');

  // Optional: handle shutdown
  fastify.addHook('onClose', async (instance, done) => {
    // Normally PubSub has no explicit close method, but you can add cleanup here if needed
    fastify.log.info('🧹 pubsubClient plugin scope closing');
    done();
  });
});
