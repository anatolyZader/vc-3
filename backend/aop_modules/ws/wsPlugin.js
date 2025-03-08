'use strict';
/* eslint-disable no-unused-vars */
const { WebSocketServer } = require('ws');

let wss;


function createWSServer(port = 8080) {
  wss = new WebSocketServer({ port });
  console.log(`WebSocket server listening on port ${port}`);
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
  });
  return wss;
}

/**
 * Registers a message handler for all incoming WebSocket messages.
 * @param {function} handler - The function to call on message receipt.
 */
function registerHandler(handler) {
  if (!wss) {
    throw new Error('WebSocket server not initialized. Call createWSServer() first.');
  }
  // For each new connection, attach the message handler.
  wss.on('connection', (ws) => {
    ws.on('message', (message) => {
      console.log('Received message on WebSocket');
      handler(message, ws);
    });
  });
}

module.exports = {
  createWSServer,
  registerHandler
};
