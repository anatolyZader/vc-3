'use strict';

module.exports = {
  $id: 'schema:chat:fetch-conversation',
  type: 'object',
  required: ['userId', 'conversationId'],
  properties: {
    userId: { type: 'string', minLength: 1 },
    conversationId: { type: 'string', format: 'uuid' }
  }
};
