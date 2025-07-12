'use strict';

module.exports = {
  $id: 'schema:ai:respond-to-prompt',
  type: 'object',
  body: {
    type: 'object',
    required: ['prompt'],
    properties: {
      prompt: { type: 'string', minLength: 1 },
      conversationId: { type: 'string' }
    },
    additionalProperties: false
  },
  response: {
    200: {
      type: 'object',
      properties: {
        response: { type: 'string' },
        status: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' }
      },
      additionalProperties: false
    }
  }
};