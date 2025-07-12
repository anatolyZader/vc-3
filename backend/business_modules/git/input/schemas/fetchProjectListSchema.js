'use strict';

const fetchProjectListSchema = {
  "$id": "schema:git:fetch-project-list",
  "type": "object",  // Added explicit type
  querystring: {
    type: 'object',
    required: ['userId'],
    properties: {
      userId: { type: 'string' },
    },
  },
  response: {  // Added response schema
    200: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
          title: { type: 'string' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' }
        }
      }
    }
  }
};

module.exports = fetchProjectListSchema;