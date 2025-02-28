'use strict';

module.exports = {
  $id: 'schema:ai-assist:respond',
  body: {
    type: 'object',
    required: ['prompt'],
    properties: {
      prompt: { type: 'string', minLength: 1 },
      conversationId: { type: 'string' } 
    },
    additionalProperties: false
  }
}
