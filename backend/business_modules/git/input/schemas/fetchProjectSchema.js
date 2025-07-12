'use strict';

const fetchProjectSchema = {
  "$id": "schema:git:fetch-project", // Note this is different from fetch-project-list
  "type": "object",
  params: {
    type: 'object',
    required: ['projectId'],
    properties: {
      projectId: { type: 'string' },
    },
  },
  querystring: {
    type: 'object',
    required: ['userId'],
    properties: {
      userId: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        owner_id: { type: 'string' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
        repositories: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              url: { type: 'string', format: 'uri' },
              description: { type: 'string', nullable: true }
            }
          }
        }
      }
    }
  }
};

module.exports = fetchProjectSchema;