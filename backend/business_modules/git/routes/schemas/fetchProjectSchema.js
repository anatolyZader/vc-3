'use strict';

const fetchProjectSchema = {
  "$id": "schema:git:fetch-project",
  querystring: {
    type: 'object',
    required: ['userId'],
    properties: {
      userId: { type: 'string' },
    },
  },
  params: {
    type: 'object',
    required: ['projectId'],
    properties: {
      projectId: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        title: { type: 'string' },
      },
      required: ['projectId', 'title'],
    },
  }
};

module.exports = fetchProjectSchema;
