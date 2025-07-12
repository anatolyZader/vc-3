'use strict';

module.exports = {
  "$id": "schema:chat:add-question",
  "type": "object",
  body: {
    type: 'object',
    required: ['prompt'],
    properties: {
      prompt: { type: 'string', minLength: 1 },
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
        questionId: { type: 'string' },
        status: { type: 'string' },
        message: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' }
      }
    }
  }
};