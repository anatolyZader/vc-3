// input/schemas/startConversationSchema.js
'use strict';

module.exports = {
  "$id": "schema:chat:start-conversation",
  "type": "object",
  body: {
    type: 'object',
    required: ['title'],
    properties: {
      title: { type: 'string', minLength: 1 },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        conversationId: { type: 'string' }
      }
    }
  }
};