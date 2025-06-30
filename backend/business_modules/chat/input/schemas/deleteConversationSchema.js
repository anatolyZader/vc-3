'use strict';

module.exports = {
  "$id": "schema:chat:delete-conversation",
  params: {
    type: 'object',
    required: ['conversationId'],
    properties: {
      conversationId: { type: 'string' },
    },
  },
};