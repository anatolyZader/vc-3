'use strict';

module.exports = {
  $id: 'schema:chat:fetch-conversation-history',
  type: 'object',
  required: ['userId'],
  properties: {
    userId: { type: 'string', minLength: 1 }
  }
};
