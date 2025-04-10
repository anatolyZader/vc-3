'use strict';

module.exports = {
  "$id": "schema:chat:delete-conversation",
  body: {
    type: 'object',
    required: ['userId'],
    properties: {
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
