'use strict';

const deleteProjectSchema = {
  $id: 'schema:git:delete-project',
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
        message: { type: 'string' }
      }
    }
  }
};

module.exports = deleteProjectSchema;
