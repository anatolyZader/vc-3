'use strict';

const fetchTargetModuleSchema = {
  $id: 'schema:git:fetch-target-module',
  type: 'object',
  params: {
    type: 'object',
    required: ['moduleId'],
    properties: {
      moduleId: { type: 'string', format: 'uuid' }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        moduleId: { type: 'string', format: 'uuid' },
        name: { type: 'string' }
      }
    }
  }
};

module.exports = fetchTargetModuleSchema;
