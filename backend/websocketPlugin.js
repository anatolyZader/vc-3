'use strict';

const fp = require('fastify-plugin');

async function websocketPlugin(fastify, options) {
  await fastify.register(require('@fastify/websocket'));

  // Store active connections per user
  const userConnections = new Map();

  fastify.register(async function (fastify) {
    fastify.get('/ws', { websocket: true }, (connection, req) => {
      const userId = req.session?.user?.id;
      
      if (!userId) {
        connection.socket.close(1008, 'Authentication required');
        return;
      }

      // Store connection for this user
      if (!userConnections.has(userId)) {
        userConnections.set(userId, new Set());
      }
      userConnections.get(userId).add(connection);

      fastify.log.info(`WebSocket connected for user: ${userId}`);

      connection.socket.on('close', () => {
        const userConns = userConnections.get(userId);
        if (userConns) {
          userConns.delete(connection);
          if (userConns.size === 0) {
            userConnections.delete(userId);
          }
        }
        fastify.log.info(`WebSocket disconnected for user: ${userId}`);
      });

      connection.socket.on('error', (error) => {
        fastify.log.error(`WebSocket error for user ${userId}:`, error);
      });
    });
  });

  // Helper function to send message to user's WebSocket connections
  fastify.decorate('sendToUser', (userId, message) => {
    const connections = userConnections.get(userId);
    if (connections) {
      const messageStr = JSON.stringify(message);
      connections.forEach(connection => {
        if (connection.socket.readyState === 1) { // OPEN
          connection.socket.send(messageStr);
        }
      });
    }
  });
}

module.exports = fp(websocketPlugin);