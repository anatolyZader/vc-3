'use strict';

module.exports = {
  "$id": "schema:chat:fetch-conversation",
  params: {
    type: 'object',
    required: ['conversationId'],
    properties: {
      conversationId: { type: 'string' },
    },
  },
};