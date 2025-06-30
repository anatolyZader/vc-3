'use strict';

module.exports = {
  "$id": "schema:chat:add-answer",
  body: {
    type: 'object',
    required: ['aiResponse'],
    properties: {
      aiResponse: { type: 'string', minLength: 1 },
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