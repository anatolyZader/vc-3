'use strict';

module.exports = {
  "$id": "schema:chat:fetch-conversation",
  "type": "object",
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
        id: { type: 'string' },
        title: { type: 'string' },
        created_at: { type: 'string', format: 'date-time' },
        messages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              content: { type: 'string' },
              role: { type: 'string', enum: ['user', 'assistant'] },
              created_at: { type: 'string', format: 'date-time' }
            }
          }
        }
      }
    }
  }
};