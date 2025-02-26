'use strict';

module.exports = {
  "$id": "schema:chat:fetch-conversation-history",
  querystring: {
    type: 'object',
    required: ['userId'],
    properties: {
      userId: { type: 'string' },
    },
  },
};
