'use strict'

// eslint-disable-next-line no-unused-vars
module.exports = async function (fastify, opts) {

  
  fastify.route({
    method: 'GET',
    url: `/hola`,
    handler: fastify.logHola  
  });

  fastify.route({
    method: 'GET',
    url: `/transcript`,
    handler: fastify.downloadTranscript
  });

  fastify.route({
    method: 'GET',
    url: `/:videoYoutubeId/transcript`,
    handler: fastify.downloadTranscript
  });

  // Snapshot creation
  fastify.route({
    method: 'POST',
    url: `/videos/:videoYoutubeId/snapshot`,
    handler: fastify.takeSnapshot
  });

  // Extracting code from a snapshot
  fastify.route({
    method: 'GET',
    url: `/videos/:videoYoutubeId/snapshots/:snapshotId`,
    handler: fastify.extractCode
  });

  // Explaining code from a code snippet
  fastify.route({
    method: 'POST',
    url: `/videos/:videoYoutubeId/codeSnippets/:codeSnippetId/explain`,
    handler: fastify.explainCode
  });

  // Explaining text from a text snippet
  fastify.route({
    method: 'POST',
    url: `/videos/:videoYoutubeId/textSnippets/:textSnippetId/explain`,
    handler: fastify.explainText
  });

  // Translating text from a text snippet
  fastify.route({
    method: 'POST',
    url: `/videos/:videoYoutubeId/textSnippets/:textSnippetId/translate`,
    handler: fastify.translateText
  });
}


  // fastify.get('/', async function (request, reply) {
  //   return { root: true }
  // })

