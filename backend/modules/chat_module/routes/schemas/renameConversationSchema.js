'use strict';

module.exports = {
  $id: 'schema:chat:rename-conversation',
  type: 'object',
  required: ['userId', 'newTitle'],
  properties: {
    userId: { type: 'string', minLength: 1 },
    conversationId: { type: 'string', format: 'uuid' },
    newTitle: { type: 'string', minLength: 1, maxLength: 255 }
  }
};
