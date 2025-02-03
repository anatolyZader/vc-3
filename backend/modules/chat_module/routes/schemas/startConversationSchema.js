'use strict';

module.exports = {
  "$id": "schema:chat:start-conversation",
  body: {
    type: 'object',
    required: ['userId', 'title'],
    properties: {
      userId: { type: 'string' },
      title: { type: 'string', minLength: 1 },
    },
  },
};
