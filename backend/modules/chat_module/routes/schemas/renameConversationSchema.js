'use strict';

module.exports = {
  "$id": "schema:chat:rename-conversation",
  body: {
    type: 'object',
    required: ['newTitle', 'userId'],
    properties: {
      newTitle: { type: 'string', minLength: 1 },
      userId: { type: 'string' },
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
