/* eslint-disable no-unused-vars */
const fp = require('fastify-plugin');

async function videoController(fastify, options) {
  const videoAppService = fastify.videoAppService;
  const ocrService = fastify.ocrService;  
  const codeSnippetService = fastify.codeSnippetService;
  const textSnippetService = fastify.textSnippetService;

  fastify.decorate('logHola', async function (request, reply) {
    try {
      
      reply.send(
        { message: 'Hola! This is the videoController.',
          YAK_env_var: fastify.secrets.YOUTUBE_API_KEY
       });
     
    } catch (error) {
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.decorate('takeSnapshot', async function (request, reply) {
    try {
      await videoAppService.takeSnapshot();
      reply.send('Snapshot saved successfully.');
    } catch (error) {
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.decorate('downloadTranscript', async function (request, reply) {
    const videoYoutubeId = request.params.videoYoutubeId;
    try {
      const transcript = await videoAppService.downloadTranscript(videoYoutubeId);
      reply.send(transcript);
    } catch (error) {
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.decorate('extractCode', async function (request, reply) {
    const imageUrl = request.params.imageUrl;
    try {
      const codeSnippet = await ocrService.extractCode(imageUrl);
      reply.send(codeSnippet);
    } catch (error) {
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.decorate('extractText', async function (request, reply) {
    const imageUrl = request.params.imageUrl;
    try {
      const textSnippet = await ocrService.extractText(imageUrl);
      reply.send(textSnippet);
    } catch (error) {
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.decorate('explainCode', async function (request, reply) {
    const codeSnippetId = request.params.codeSnippetId;
    try {
      const codeExplanation = await codeSnippetService.explainCode(codeSnippetId);
      reply.send(codeExplanation);
    } catch (error) {
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.decorate('explainText', async function (request, reply) {
    const textSnippetId = request.params.textSnippetId;
    try {
      const textExplanation = await textSnippetService.explainText(textSnippetId);
      reply.send(textExplanation);
    } catch (error) {
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.decorate('translateText', async function (request, reply) {
    const textSnippetId = request.params.textSnippetId;
    try {
      const textTranslation = await textSnippetService.translateText(textSnippetId);
      reply.send(textTranslation);
    } catch (error) {
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });
}

module.exports = fp(videoController);