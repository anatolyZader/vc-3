'use strict';

module.exports = {
  $id: 'schema:chat:start-conversation',
  type: 'object',
  required: ['userId', 'title'],
  properties: {
    userId: { type: 'string', minLength: 1 },
    title: { type: 'string', minLength: 1, maxLength: 255 }
  }
};
