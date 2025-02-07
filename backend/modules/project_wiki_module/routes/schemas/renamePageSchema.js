'use strict';

module.exports = {
  $id: 'schema:wiki:rename-page',
  params: {
    type: 'object',
    required: ['pageId'],
    properties: {
      pageId: { type: 'string', format: 'uuid', description: 'Unique identifier of the wiki page to rename.' }
    },
    additionalProperties: false
  },
  body: {
    type: 'object',
    required: ['userId', 'newTitle'],
    properties: {
      userId: { type: 'string', format: 'uuid', description: 'Unique identifier of the user renaming the wiki page.' },
      newTitle: { type: 'string', minLength: 1, description: 'New title for the wiki page.' }
    },
    additionalProperties: false
  }
};
