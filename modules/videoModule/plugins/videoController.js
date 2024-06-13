/* eslint-disable no-unused-vars */
const fp = require('fastify-plugin');

let videoAppService, ocrService, codeSnippetService, textSnippetService; //  declare variables outside the onReady hook and assign them within the hook. This way, they will be accessible throughout the module.

async function videoController(fastify, options) {

  fastify.decorate('logHola', async function (request, reply) {
    try {
      console.log('Starting logHola handler');
      console.log('Hola! This is the videoController.');
      console.log('videoAppService: ', videoAppService);
      console.log('YAK_env_var: ', fastify.secrets.YOUTUBE_API_KEY);
      reply.send({ message: 'Hola! This is the videoController in browser.', YAK_env_var: fastify.secrets.YOUTUBE_API_KEY });
      console.log('Finished logHola handler');
    } catch (error) {
      console.error('Error in logHola handler:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.decorate('makeSnapshot', async function (request, reply) {
    try {
      const videoYoutubeId = 1234567;
      await this.videoAppService.takeSnapshot(videoYoutubeId);
      reply.send('Snapshot saved successfully.');
    } catch (error) {
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.decorate('downloadTranscript', async function (request, reply) {
    const videoYoutubeId = request.params.videoYoutubeId;
    try {
      const transcript = await this.videoAppService.downloadTranscript(videoYoutubeId);
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
  fastify.addHook('onReady', async function () {
    try {
      const videoAppService = fastify.diContainer.resolve('videoAppService');
      const ocrService = fastify.diContainer.resolve("ocrService");
      const codeSnippetService = fastify.diContainer.resolve("codeSnippetService");
      const textSnippetService = fastify.diContainer.resolve("textSnippetService");
      console.log('videoAppService:', videoAppService);
    } catch (error) {
      fastify.log.error('Error resolving videoAppService:', error);
    }
  });
}


module.exports = fp(videoController);