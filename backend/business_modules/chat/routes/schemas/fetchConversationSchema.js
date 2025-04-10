'use strict';

module.exports = {
  "$id": "schema:chat:fetch-conversation",
  querystring: {
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
