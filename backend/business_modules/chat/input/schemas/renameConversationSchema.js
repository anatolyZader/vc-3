'use strict';

module.exports = {
  "$id": "schema:chat:rename-conversation",
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
};