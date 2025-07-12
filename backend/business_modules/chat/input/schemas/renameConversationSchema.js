'use strict';

module.exports = {
  "$id": "schema:chat:rename-conversation",
  "type": "object",
  body: {
    type: 'object',
    required: ['newTitle'],
    properties: {
      newTitle: { type: 'string', minLength: 1 },
    },
  },
  params: {
    type: 'object',
    required: ['conversationId'],
    properties: {
      conversationId: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' }
      }
    }
  }
};