'use strict';

const renameProjectSchema = {
  "$id": "schema:git:rename-project",
  "type": "object",
  body: {
    type: 'object',
    required: ['newTitle'],
    properties: {
      newTitle: { 
        type: 'string', 
        minLength: 1,
        description: 'New title for the project'
      }
    },
    additionalProperties: false
  },
  params: {
    type: 'object',
    required: ['projectId'],
    properties: {
      projectId: { 
        type: 'string',
        description: 'Project ID to rename'
      }
    },
    additionalProperties: false
  },
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Project renamed successfully' },
        project: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    404: {
      type: 'object',
      properties: {
        statusCode: { type: 'integer', enum: [404] },
        error: { type: 'string', example: 'Not Found' },
        message: { type: 'string', example: 'Project not found' }
      }
    },
    401: {
      type: 'object',
      properties: {
        statusCode: { type: 'integer', enum: [401] },
        error: { type: 'string', example: 'Unauthorized' },
        message: { type: 'string', example: 'Authentication required' }
      }
    }
  }
};

module.exports = renameProjectSchema;