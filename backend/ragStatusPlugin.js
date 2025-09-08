// 'use strict';

// const fp = require('fastify-plugin');

// /**
//  * Plugin to track RAG status and provide diagnostics
//  */
// async function ragStatusPlugin(fastify, options) {
//   fastify.log.info('🔍 Initializing RAG status monitoring plugin...');

//   // Store for recent RAG status updates
//   const ragStatusStore = new Map();
  
//   // Get the shared event bus from the eventDispatcher module
//   const { eventBus } = require('./eventDispatcher');

//   // Listen for RAG status update events
//   eventBus.on('ragStatusUpdate', (data) => {
//     fastify.log.info(`🔍 RAG status update received: ${JSON.stringify(data)}`);
    
//     // Store status update with timestamp
//     const statusData = {
//       ...data,
//       receivedAt: new Date().toISOString()
//     };
    
//     // Use conversationId as key if available, otherwise userId + timestamp
//     const key = data.conversationId || `${data.userId}_${Date.now()}`;
//     ragStatusStore.set(key, statusData);
    
//     // Limit store size by removing old entries if we exceed 100 items
//     if (ragStatusStore.size > 100) {
//       const keysIterator = ragStatusStore.keys();
//       ragStatusStore.delete(keysIterator.next().value);
//     }
//   });

//   // Provide a function to check if RAG is being used for a conversation
//   fastify.decorate('getRagStatus', (conversationId) => {
//     return ragStatusStore.get(conversationId) || { status: 'unknown' };
//   });
  
//   // Add a diagnostic route to check RAG status (admin only)
//  fastify.get('/api/rag/status/:conversationId', {
//   schema: {
//     description: 'Get RAG status for a conversation',
//     tags: ['admin'],
//     params: {
//       type: 'object',
//       properties: {
//         conversationId: { type: 'string' }
//       }
//     },
//     security: [{ bearer: [] }]
//   },
//   preValidation: fastify.verifyToken,  // Use the existing verifyToken function
//   handler: async (request, reply) => {
//     const { conversationId } = request.params;
    
//     const status = ragStatusStore.get(conversationId) || { status: 'unknown' };
//     return {
//       conversationId,
//       ragStatus: status
//     };
//   }
// });

// // Do the same for the other endpoint
// fastify.get('/api/rag/recent', {
//   schema: {
//     description: 'Get recent RAG status updates',
//     tags: ['admin'],
//     security: [{ bearer: [] }]
//   },
//   preValidation: fastify.verifyToken,  // Use the existing verifyToken function
//   handler: async (request, reply) => {
//     const recentStatuses = Array.from(ragStatusStore.entries())
//       .map(([key, value]) => ({ key, ...value }))
//       .sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt))
//       .slice(0, 20); // Return the 20 most recent
    
//     return {
//       count: recentStatuses.length,
//       statuses: recentStatuses
//     };
//   }
// });
  
//   fastify.log.info('✅ RAG status monitoring plugin initialized');
// }

// module.exports = fp(ragStatusPlugin);
