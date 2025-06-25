// websocketPlugin.js
/* eslint-disable no-unused-vars */
'use strict';

const fp = require('fastify-plugin');
const fastifyWebsocket = require('@fastify/websocket');

module.exports = fp(async function websocketPlugin(fastify, opts) {
  // 1️⃣ Register the WS engine
  await fastify.register(fastifyWebsocket);

  // 2️⃣ Store active connections per user with metadata
  const userConnections = new Map();
  const connectionMetrics = {
    totalConnections: 0,
    activeConnections: 0,
    reconnections: 0,
    errors: 0,
    messagesProcessed: 0
  };

  // 3️⃣ Enhanced sendToUser with error handling and retry logic
  fastify.decorate('sendToUser', (userId, payload, options = {}) => {
    const { retryOnError = true, maxRetries = 3 } = options;
    const conns = userConnections.get(userId);
    
    if (!conns || conns.size === 0) {
      fastify.log.warn(`[2025-06-25 09:14:06] No WS connections for user ${userId}`);
      return { success: false, reason: 'no_connections', userId };
    }

    const msg = JSON.stringify({
      ...payload,
      timestamp: new Date().toISOString(),
      userId // Always include userId for client-side validation
    });

    let successCount = 0;
    let failureCount = 0;
    const deadConnections = [];

    for (const connection of conns) {
      try {
        if (connection.socket.readyState === connection.socket.OPEN) {
          connection.socket.send(msg);
          successCount++;
          connectionMetrics.messagesProcessed++;
          
          // Update last message timestamp
          connection.lastMessageSent = new Date().toISOString();
        } else if (connection.socket.readyState === connection.socket.CLOSED) {
          deadConnections.push(connection);
          fastify.log.debug(`[2025-06-25 09:14:06] Removing dead connection for user ${userId}`);
        }
      } catch (error) {
        failureCount++;
        connectionMetrics.errors++;
        fastify.log.error(`[2025-06-25 09:14:06] Failed to send message to user ${userId}:`, error.message);
        
        // Mark connection for removal if persistently failing
        if (!connection.errorCount) connection.errorCount = 0;
        connection.errorCount++;
        
        if (connection.errorCount >= maxRetries) {
          deadConnections.push(connection);
          fastify.log.warn(`[2025-06-25 09:14:06] Removing failing connection for user ${userId} after ${maxRetries} attempts`);
        }
      }
    }

    // Clean up dead connections
    deadConnections.forEach(deadConn => {
      conns.delete(deadConn);
      connectionMetrics.activeConnections--;
    });

    // Remove user entry if no connections left
    if (conns.size === 0) {
      userConnections.delete(userId);
      fastify.log.info(`[2025-06-25 09:14:06] Removed all connections for user ${userId}`);
    }

    return {
      success: successCount > 0,
      successCount,
      failureCount,
      totalConnections: successCount + failureCount,
      userId,
      timestamp: new Date().toISOString()
    };
  });

  // 4️⃣ Enhanced health-check and metrics
  fastify.decorate('getActiveConnections', () => {
    const connectionSummary = Array.from(userConnections.entries()).reduce((out, [id, conns]) => {
      out[id] = {
        count: conns.size,
        connections: Array.from(conns).map(conn => ({
          connectedAt: conn.connectedAt,
          lastMessageSent: conn.lastMessageSent || 'never',
          errorCount: conn.errorCount || 0,
          readyState: conn.socket.readyState
        }))
      };
      return out;
    }, {});

    return {
      users: connectionSummary,
      totalUsers: userConnections.size,
      metrics: connectionMetrics,
      timestamp: new Date().toISOString()
    };
  });

  // 5️⃣ Connection health monitoring
  fastify.decorate('getConnectionHealth', (userId) => {
    const conns = userConnections.get(userId);
    if (!conns) {
      return { healthy: false, reason: 'no_connections', userId };
    }

    const healthyConnections = Array.from(conns).filter(conn => 
      conn.socket.readyState === conn.socket.OPEN && (conn.errorCount || 0) < 3
    );

    return {
      healthy: healthyConnections.length > 0,
      totalConnections: conns.size,
      healthyConnections: healthyConnections.length,
      userId,
      timestamp: new Date().toISOString()
    };
  });

  // 6️⃣ Broadcast to all users (useful for system messages)
  fastify.decorate('broadcastToAllUsers', (payload, options = {}) => {
    const results = [];
    for (const userId of userConnections.keys()) {
      const result = fastify.sendToUser(userId, {
        ...payload,
        type: 'broadcast'
      }, options);
      results.push({ userId, ...result });
    }
    return {
      broadcast: true,
      totalUsers: results.length,
      results,
      timestamp: new Date().toISOString()
    };
  });

  // 7️⃣ Enhanced WebSocket route with comprehensive error handling
  fastify.get('/ws', {
    websocket: true,
    preHandler: fastify.verifyToken
  }, (connection, req) => {
    const userId = req.user.id;
    const userAgent = req.headers['user-agent'] || 'unknown';
    const clientIp = req.ip || 'unknown';
    
    fastify.log.info(`[2025-06-25 09:14:06] 🔗 WS connected for user ${userId} from ${clientIp}`);

    // Initialize connection metadata
    connection.connectedAt = new Date().toISOString();
    connection.userId = userId;
    connection.userAgent = userAgent;
    connection.clientIp = clientIp;
    connection.errorCount = 0;
    connection.messagesReceived = 0;

    // Add to user connections map
    if (!userConnections.has(userId)) {
      userConnections.set(userId, new Set());
    }
    userConnections.get(userId).add(connection);
    
    // Update metrics
    connectionMetrics.totalConnections++;
    connectionMetrics.activeConnections++;

    // Send enhanced welcome message
    const welcomeMessage = {
      type: 'connected',
      userId,
      connectionId: `${userId}_${Date.now()}`,
      serverTime: new Date().toISOString(),
      features: ['real-time-chat', 'ai-responses', 'typing-indicators'],
      version: '1.0.0'
    };

    try {
      connection.socket.send(JSON.stringify(welcomeMessage));
      fastify.log.debug(`[2025-06-25 09:14:06] Welcome message sent to user ${userId}`);
    } catch (error) {
      fastify.log.error(`[2025-06-25 09:14:06] Failed to send welcome message to user ${userId}:`, error);
      connection.errorCount++;
    }

    // Enhanced cleanup function
    function teardown(reason = 'unknown') {
      try {
        const conns = userConnections.get(userId);
        if (conns) {
          conns.delete(connection);
          connectionMetrics.activeConnections--;
          
          if (conns.size === 0) {
            userConnections.delete(userId);
            fastify.log.info(`[2025-06-25 09:14:06] All connections removed for user ${userId}`);
          }
        }
        
        fastify.log.info(`[2025-06-25 09:14:06] 🔌 WS disconnected for user ${userId} (reason: ${reason})`);
      } catch (cleanupError) {
        fastify.log.error(`[2025-06-25 09:14:06] Error during connection cleanup for user ${userId}:`, cleanupError);
      }
    }

    // Enhanced error handling
    connection.socket.on('error', (error) => {
      connection.errorCount++;
      connectionMetrics.errors++;
      
      fastify.log.error(`[2025-06-25 09:14:06] WS error for user ${userId} (error #${connection.errorCount}):`, {
        message: error.message,
        code: error.code,
        userAgent: connection.userAgent,
        clientIp: connection.clientIp
      });

      // Auto-disconnect after too many errors
      if (connection.errorCount >= 5) {
        fastify.log.warn(`[2025-06-25 09:14:06] Force disconnecting user ${userId} due to excessive errors`);
        try {
          connection.socket.close(1011, 'Too many errors');
        } catch (closeError) {
          fastify.log.error(`[2025-06-25 09:14:06] Error force-closing connection:`, closeError);
        }
      }
      
      teardown(`error_${error.code || 'unknown'}`);
    });

    // Enhanced close handling
    connection.socket.on('close', (code, reason) => {
      const closeReason = reason ? reason.toString() : 'no_reason';
      fastify.log.info(`[2025-06-25 09:14:06] WS closed for user ${userId} (code: ${code}, reason: ${closeReason})`);
      teardown(`close_${code}`);
    });

    // Enhanced message handling with error recovery
    connection.socket.on('message', (data) => {
      try {
        connection.messagesReceived++;
        
        let msg;
        try {
          msg = JSON.parse(data.toString());
        } catch (parseError) {
          fastify.log.error(`[2025-06-25 09:14:06] Invalid JSON from user ${userId}:`, parseError.message);
          
          // Send error response to client
          connection.socket.send(JSON.stringify({
            type: 'error',
            error: 'Invalid JSON format',
            timestamp: new Date().toISOString()
          }));
          return;
        }

        fastify.log.debug(`[2025-06-25 09:14:06] WS message from user ${userId}:`, msg);

        // Handle different message types
        switch (msg.type) {
          case 'ping':
            connection.socket.send(JSON.stringify({
              type: 'pong',
              timestamp: new Date().toISOString()
            }));
            break;
            
          case 'heartbeat':
            connection.lastHeartbeat = new Date().toISOString();
            connection.socket.send(JSON.stringify({
              type: 'heartbeat_ack',
              timestamp: new Date().toISOString()
            }));
            break;
            
          case 'typing':
            // Broadcast typing indicator to other users in the conversation
            if (msg.conversationId) {
              // This could be enhanced to broadcast to specific conversation participants
              fastify.log.debug(`[2025-06-25 09:14:06] User ${userId} typing in conversation ${msg.conversationId}`);
            }
            break;
            
          default:
            fastify.log.debug(`[2025-06-25 09:14:06] Unknown message type '${msg.type}' from user ${userId}`);
        }

      } catch (messageError) {
        connection.errorCount++;
        fastify.log.error(`[2025-06-25 09:14:06] Error processing message from user ${userId}:`, messageError);
        
        try {
          connection.socket.send(JSON.stringify({
            type: 'error',
            error: 'Failed to process message',
            timestamp: new Date().toISOString()
          }));
        } catch (sendError) {
          fastify.log.error(`[2025-06-25 09:14:06] Failed to send error response to user ${userId}:`, sendError);
        }
      }
    });

    // Periodic connection health check
    const healthCheckInterval = setInterval(() => {
      if (connection.socket.readyState !== connection.socket.OPEN) {
        clearInterval(healthCheckInterval);
        teardown('health_check_failed');
        return;
      }

      // Send periodic ping to detect dead connections
      try {
        connection.socket.send(JSON.stringify({
          type: 'ping',
          timestamp: new Date().toISOString()
        }));
      } catch (pingError) {
        fastify.log.error(`[2025-06-25 09:14:06] Health check ping failed for user ${userId}:`, pingError);
        clearInterval(healthCheckInterval);
        teardown('ping_failed');
      }
    }, 30000); // Ping every 30 seconds

    // Cleanup interval on connection close
    connection.socket.on('close', () => {
      clearInterval(healthCheckInterval);
    });
  });

  // 8️⃣ Graceful shutdown handling
  fastify.addHook('onClose', async () => {
    fastify.log.info(`[2025-06-25 09:14:06] Shutting down WebSocket plugin, closing ${connectionMetrics.activeConnections} active connections...`);
    
    // Notify all connected users about shutdown
    const shutdownMessage = {
      type: 'server_shutdown',
      message: 'Server is shutting down. Please reconnect in a few moments.',
      timestamp: new Date().toISOString()
    };

    for (const [userId, connections] of userConnections.entries()) {
      for (const connection of connections) {
        try {
          if (connection.socket.readyState === connection.socket.OPEN) {
            connection.socket.send(JSON.stringify(shutdownMessage));
            connection.socket.close(1001, 'Server shutdown');
          }
        } catch (error) {
          fastify.log.error(`[2025-06-25 09:14:06] Error closing connection for user ${userId}:`, error);
        }
      }
    }

    // Clear all connections
    userConnections.clear();
    connectionMetrics.activeConnections = 0;
    
    fastify.log.info(`[2025-06-25 09:14:06] WebSocket plugin shutdown complete`);
  });

  fastify.log.info(`[2025-06-25 09:14:06] ✅ WebSocket plugin initialized with enhanced error handling for anatolyZader`);
});