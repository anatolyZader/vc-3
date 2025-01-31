'use strict';

const fetchProjectListSchema = {
  $id: 'schema:git:fetch-project-list',
  type: 'object',
  querystring: {
    type: 'object',
    required: ['ownerId'],
    properties: {
      ownerId: { type: 'string', format: 'uuid' }
    }
  },
  response: {
    200: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          projectId: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' }
        }
      }
    }
  }
};

module.exports = fetchProjectListSchema;
