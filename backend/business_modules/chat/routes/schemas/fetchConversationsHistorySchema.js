'use strict';

module.exports = {
  "$id": "schema:chat:fetch-conversations-history",
  querystring: {
    type: 'object',
    required: ['userId'],
    properties: {
      userId: { type: 'string' },
    },
  },
};
