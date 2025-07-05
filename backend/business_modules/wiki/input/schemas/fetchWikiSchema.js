// fetchWikiSchema.js
'use strict';
module.exports = {
    $id: 'schema:wiki:fetch-wiki',
    params: {
        type: 'object',
        required: ['repoId'],
        properties: {
        repoId: {
            type: 'string',
            description: 'The ID of the repository.'
        }
        },
        additionalProperties: false
    },
    response: {
        200: {
        type: 'object',
        properties: {
            message: { type: 'string' },
            wiki: { type: 'array', items: { type: 'object' } }
        },
        additionalProperties: false
        }
    }
};