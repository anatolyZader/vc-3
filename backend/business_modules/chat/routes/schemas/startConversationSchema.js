'use strict';

module.exports = {
  "$id": "schema:chat:start-conversation",
  body: {
    type: 'object',
    required: ['title'],
    properties: {
      title: { type: 'string', minLength: 1 },
    },
  },
};