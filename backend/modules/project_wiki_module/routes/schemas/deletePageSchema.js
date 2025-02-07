'use strict';

module.exports = {
  $id: 'schema:wiki:delete-page',
  params: {
    type: 'object',
    required: ['pageId'],
    properties: {
      pageId: { type: 'string', format: 'uuid', description: 'Unique identifier of the wiki page to delete.' }
    },
    additionalProperties: false
  },
  body: {
    type: 'object',
    required: ['userId'],
    properties: {
      userId: { type: 'string', format: 'uuid', description: 'Unique identifier of the user deleting the wiki page.' }
    },
    additionalProperties: false
  }
};
