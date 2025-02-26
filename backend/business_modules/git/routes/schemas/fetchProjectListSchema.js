'use strict';

const fetchProjectListSchema = {
  "$id": "schema:git:fetch-project-list",
  querystring: {
    type: 'object',
    required: ['userId'],
    properties: {
      userId: { type: 'string' },
    },
  },
};

module.exports = fetchProjectListSchema;
