'use strict';

module.exports = {
  $id: 'schema:chat:delete-conversation',
  type: 'object',
  required: ['userId'],
  properties: {
    userId: { type: 'string', minLength: 1 },
    conversationId: { type: 'string', format: 'uuid' }
  }
};
