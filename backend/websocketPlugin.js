// websocketPlugin.js
/* eslint-disable no-unused-vars */

'use strict';

const fp = require('fastify-plugin');
const fastifyWebsocket = require('@fastify/websocket');

async function websocketPlugin(fastify, options) {
  await fastify.register(fastifyWebsocket);

  // Store active connections per user
  const userConnections = new Map();

  fastify.register(async function (fastify) {
    fastify.get('/ws', { websocket: true }, (connection, req) => {
      console.log('=== WEBSOCKET CONNECTION ATTEMPT ===');
      console.log('Time: 2025-06-16 13:52:10');
      console.log('User: anatolyZader');
      console.log('Cookies:', req.cookies);
      
      let userId = null;
      
      try {
        // Extract JWT token from cookies (same as your auth system)
        const authToken = req.cookies?.authToken;
        
        if (!authToken) {
          console.log('❌ No authToken cookie found');
          connection.socket.close(1008, 'Authentication required - no token');
          return;
        }
        
        // Verify JWT token
        const decoded = fastify.jwt.verify(authToken);
        userId = decoded.id;
        
        console.log('✅ WebSocket authenticated for user:', userId);
        console.log('User data:', { id: decoded.id, username: decoded.username });
        
      } catch (error) {
        console.log('❌ WebSocket auth failed:', error.message);
        connection.socket.close(1008, 'Authentication failed - invalid token');
        return;
      }

      // Store connection for this user
      if (!userConnections.has(userId)) {
        userConnections.set(userId, new Set());
      }
      userConnections.get(userId).add(connection);

      fastify.log.info(`WebSocket connected for user: ${userId}`);

      // Send welcome message
      connection.socket.send(JSON.stringify({
        type: 'connected',
        message: 'WebSocket connected successfully',
        userId: userId,
        timestamp: new Date().toISOString()
      }));

      // Handle incoming messages
      connection.socket.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          console.log('WebSocket message from user', userId, ':', message);
          
          // Echo back for testing
          connection.socket.send(JSON.stringify({
            type: 'echo',
            originalMessage: message,
            timestamp: new Date().toISOString()
          }));
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      });

      // Handle connection close
      connection.socket.on('close', (code, reason) => {
        console.log(`WebSocket closed for user ${userId}:`, code, reason?.toString());
        
        const userConns = userConnections.get(userId);
        if (userConns) {
          userConns.delete(connection);
          if (userConns.size === 0) {
            userConnections.delete(userId);
          }
        }
        fastify.log.info(`WebSocket disconnected for user: ${userId}`);
      });

      // Handle errors
      connection.socket.on('error', (error) => {
        console.error(`WebSocket error for user ${userId}:`, error);
        fastify.log.error(`WebSocket error for user ${userId}:`, error);
      });
    });
  });

  // Helper function to send message to user's WebSocket connections
  fastify.decorate('sendToUser', (userId, message) => {
    const connections = userConnections.get(userId);
    if (connections && connections.size > 0) {
      const messageStr = JSON.stringify(message);
      console.log(`Sending WebSocket message to user ${userId}:`, message);
      
      connections.forEach(connection => {
        try {
          if (connection.socket.readyState === 1) { // WebSocket.OPEN
            connection.socket.send(messageStr);
          }
        } catch (error) {
          console.error('Error sending WebSocket message:', error);
        }
      });
    } else {
      console.log(`No active WebSocket connections for user ${userId}`);
    }
  });

  // Debug function to show active connections
  fastify.decorate('getActiveConnections', () => {
    const stats = {};
    userConnections.forEach((connections, userId) => {
      stats[userId] = connections.size;
    });
    return stats;
  });
}

module.exports = fp(websocketPlugin);