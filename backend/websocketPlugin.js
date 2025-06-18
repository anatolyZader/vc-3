// websocketPlugin.js
/* eslint-disable no-unused-vars */
'use strict';

const fp = require('fastify-plugin');
const fastifyWebsocket = require('@fastify/websocket');

module.exports = fp(async function websocketPlugin(fastify, opts) {
  // 1️⃣ Register the WS engine
  await fastify.register(fastifyWebsocket);

  // 2️⃣ Store active connections per user
  const userConnections = new Map();

  // 3️⃣ Expose sendToUser so controllers/adapters can push
  fastify.decorate('sendToUser', (userId, payload) => {
    const conns = userConnections.get(userId);
    if (!conns) {
      fastify.log.warn(`No WS connections for user ${userId}`);
      return;
    }
    const msg = JSON.stringify(payload);
    for (const { socket } of conns) {
      if (socket.readyState === socket.OPEN) {
        socket.send(msg);
      }
    }
  });

  // 4️⃣ Health-check / debug method
  fastify.decorate('getActiveConnections', () => {
    return Array.from(userConnections.entries()).reduce((out, [id, conns]) => {
      out[id] = conns.size;
      return out;
    }, {});
  });

  // 5️⃣ Declare the WebSocket route under your /api prefix
  fastify.get('/ws', {
    websocket: true,
    // reuse your existing JWT logic
    preHandler: fastify.verifyToken
  }, (connection, req) => {
    const userId = req.user.id;
    fastify.log.info(`🔗 WS connected for user ${userId}`);

    // Add to map
    if (!userConnections.has(userId)) {
      userConnections.set(userId, new Set());
    }
    userConnections.get(userId).add(connection);

    // Send a welcome message
    connection.socket.send(JSON.stringify({
      type: 'connected',
      userId,
      timestamp: (new Date()).toISOString()
    }));

    // Clean up on close or error
    function teardown() {
      const conns = userConnections.get(userId);
      if (!conns) return;
      conns.delete(connection);
      if (conns.size === 0) userConnections.delete(userId);
      fastify.log.info(`🔌 WS disconnected for user ${userId}`);
    }
    connection.socket.on('close', teardown);
    connection.socket.on('error', err => {
      fastify.log.error(`WS error for ${userId}:`, err);
      teardown();
    });

    // (Optional) handle incoming client messages
    connection.socket.on('message', data => {
      let msg;
      try { msg = JSON.parse(data); }
      catch (e) { return fastify.log.error('Invalid WS JSON:', e); }
      fastify.log.debug(`WS from ${userId}:`, msg);
      // e.g. you could route read-receipts back into your pub/sub here
    });
  });
});
