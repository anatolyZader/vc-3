'use strict';

module.exports = {
  $id: 'schema:chat:send-question',
  type: 'object',
  required: ['userId', 'content', 'prompt'],
  properties: {
    userId: { type: 'string', minLength: 1 },
    conversationId: { type: 'string', format: 'uuid' },
    content: { type: 'string', minLength: 1 },
    prompt: { type: 'string', minLength: 1 }
  }
};
