/* eslint-disable no-unused-vars */
const fp = require('fastify-plugin');

let videoAppService, ocrService, codeSnippetService, textSnippetService;

async function videoController(fastify, options) {

  fastify.decorate('logHola', async function (request, reply) {
    try {
      console.log('Starting logHola handler');
      console.log('Hola! This is the videoController.');
      console.log("videoAppService at videoController.logHola(): ", videoAppService);
      console.log('YAK_env_var: ', fastify.secrets.YOUTUBE_API_KEY);
      reply.send({ message: 'Hola! This is the videoController in browser.', YAK_env_var: fastify.secrets.YOUTUBE_API_KEY });
      console.log('Finished logHola handler');
    } catch (error) {
      console.error('Error in logHola handler:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.decorate('makeSnapshot', async function (request, reply) {
    if (!videoAppService) {
      reply.status(500).send({ error: 'Service not initialized' });
      return;
    }
    try {
      const videoYoutubeId = request.params.videoYoutubeId; // or request.body.videoYoutubeId
      await videoAppService.takeSnapshot(videoYoutubeId);
      reply.send('Snapshot saved successfully.');
    } catch (error) {
      fastify.log.error('Error taking snapshot:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.decorate('downloadTranscript', async function (request, reply) {
    if (!videoAppService) {
      reply.status(500).send({ error: 'Service not initialized' });
      return;
    }
    const videoYoutubeId = request.params.videoYoutubeId;
    try {
      const transcript = await videoAppService.downloadTranscript(videoYoutubeId);
      reply.send(transcript);
    } catch (error) {
      fastify.log.error('Error downloading transcript:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.decorate('extractCode', async function (request, reply) {
    if (!ocrService) {
      reply.status(500).send({ error: 'Service not initialized' });
      return;
    }
    const imageUrl = request.params.imageUrl;
    try {
      const codeSnippet = await ocrService.extractCode(imageUrl);
      reply.send(codeSnippet);
    } catch (error) {
      fastify.log.error('Error extracting code:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.decorate('extractText', async function (request, reply) {
    if (!ocrService) {
      reply.status(500).send({ error: 'Service not initialized' });
      return;
    }
    const imageUrl = request.params.imageUrl;
    try {
      const textSnippet = await ocrService.extractText(imageUrl);
      reply.send(textSnippet);
    } catch (error) {
      fastify.log.error('Error extracting text:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.decorate('explainCode', async function (request, reply) {
    if (!codeSnippetService) {
      reply.status(500).send({ error: 'Service not initialized' });
      return;
    }
    const codeSnippetId = request.params.codeSnippetId;
    try {
      const codeExplanation = await codeSnippetService.explainCode(codeSnippetId);
      reply.send(codeExplanation);
    } catch (error) {
      fastify.log.error('Error explaining code:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.decorate('explainText', async function (request, reply) {
    if (!textSnippetService) {
      reply.status(500).send({ error: 'Service not initialized' });
      return;
    }
    const textSnippetId = request.params.textSnippetId;
    try {
      const textExplanation = await textSnippetService.explainText(textSnippetId);
      reply.send(textExplanation);
    } catch (error) {
      fastify.log.error('Error explaining text:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.decorate('translateText', async function (request, reply) {
    if (!textSnippetService) {
      reply.status(500).send({ error: 'Service not initialized' });
      return;
    }
    const textSnippetId = request.params.textSnippetId;
    try {
      const textTranslation = await textSnippetService.translateText(textSnippetId);
      reply.send(textTranslation);
    } catch (error) {
      fastify.log.error('Error translating text:', error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.addHook('onReady', async function () {
    try {
      videoAppService = fastify.diContainer.resolve('videoAppService');
      ocrService = fastify.diContainer.resolve("ocrService");
      codeSnippetService = fastify.diContainer.resolve("codeSnippetService");
      textSnippetService = fastify.diContainer.resolve("textSnippetService");
      console.log('videoAppService at videoController / onReady:', videoAppService);
    } catch (error) {
      fastify.log.error('Error resolving services:', error);
    }
  });
}

module.exports = fp(videoController);