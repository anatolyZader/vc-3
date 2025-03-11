// wsPlugin.js
/* eslint-disable no-unused-vars */
'use strict';

const { WebSocketServer } = require('ws');
const { v4: uuidv4 } = require('uuid');
const ChatService = require('../../business_modules/chat/application/services/chatService'); 

let wss;

function createWSServer(port = 8080) {
  wss = new WebSocketServer({ port });
  console.log(`WebSocket server listening on port ${port}`);

  wss.on('connection', (ws) => {
    ws.id = uuidv4();
    console.log(`WebSocket client connected with ID: ${ws.id}`);
  });

  return wss;
}

// Registers a message handler for WebSocket chat messages.

function registerChatHandler() {
  if (!wss) {
    throw new Error('WebSocket server not initialized. Call createWSServer() first.');
  }

  const chatService = new ChatService(); 

  wss.on('connection', (ws) => {
    ws.on('message', async (message) => {
      console.log(`Received message from client ${ws.id}:`, message.toString());

      try {
        const parsedMessage = JSON.parse(message.toString());

        if (parsedMessage.action === 'chat') {
          const { userId, conversationId, prompt } = parsedMessage;
          if (!userId || !conversationId || !prompt) {
            return ws.send(JSON.stringify({ error: 'Missing required chat fields' }));
          }

          // Forward message to ChatService
          await chatService.addQuestion(userId, conversationId, prompt);
          ws.send(JSON.stringify({ status: 'Processing AI response...' })); // Immediate response
        } else {
          ws.send(JSON.stringify({ error: 'Unknown action' }));
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
        ws.send(JSON.stringify({ error: 'Invalid message format' }));
      }
    });
  });
}

module.exports = {
  createWSServer,
  registerChatHandler,
  getWSServer: () => wss, // Allows access to WebSocket Server instance
};
