'use strict';

const fetchProjectSchema = {
  $id: 'schema:git:fetch-project',
  type: 'object',
  params: {
    type: 'object',
    required: ['projectId'],
    properties: {
      projectId: { type: 'string', format: 'uuid' }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        projectId: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' }
      }
    }
  }
};

module.exports = fetchProjectSchema;
