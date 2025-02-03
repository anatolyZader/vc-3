'use strict';

module.exports = {
  "$id": "schema:chat:send-question",
  body: {
    type: 'object',
    required: ['userId', 'content', 'prompt'],
    properties: {
      userId: { type: 'string' },
      content: { type: 'string' },
      prompt: { type: 'string' },
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
